import { Scraper, ScrapedData, ScraperHeaders } from "../types/index.ts";
import { isValidUrl } from "../utils/url.ts";
import { fetchWithRetry, createError } from "../utils/fetch.ts";
import { 
  parseHtml, 
  extractJobData, 
  validateJobData, 
  cleanJobData 
} from "../utils/html.ts";
import { scraperCache, CacheOptions } from "../utils/cache.ts";
import { globalRateLimiter } from "../utils/rate-limit.ts";
import { monitor } from "../utils/monitoring.ts";

/**
 * Base scraper class that implements common functionality
 * All specific scrapers should extend this class
 */
export abstract class BaseScraper implements Scraper {
  /**
   * Name of the scraper for logging and debugging
   */
  abstract readonly name: string;
  
  /**
   * Domain patterns that this scraper can handle
   * Override in subclasses with specific patterns
   */
  protected abstract readonly domainPatterns: RegExp[];
  
  /**
   * Cache configuration for this scraper
   * Override in subclasses to customize caching behavior
   */
  protected readonly cacheOptions: CacheOptions = {
    ttl_hours: 24, // Default 24-hour cache
    bypass_cache: false
  };
  
  /**
   * Determines if this scraper can handle the given URL
   * 
   * @param url URL to check
   * @returns True if this scraper can handle the URL
   */
  canHandle(url: string): boolean {
    if (!isValidUrl(url)) {
      return false;
    }
    
    return this.domainPatterns.some(pattern => pattern.test(url));
  }
  
  /**
   * Performs the scraping operation
   * 
   * @param url URL to scrape
   * @param options Optional scraping options, including bypass_cache
   * @returns Scraped job data
   */
  async scrape(url: string, options?: { bypass_cache?: boolean }): Promise<ScrapedData> {
    if (!this.canHandle(url)) {
      throw new Error(`Scraper ${this.name} cannot handle URL: ${url}`);
    }
    
    // Merge provided options with defaults
    const scrapeOptions = {
      bypass_cache: options?.bypass_cache || this.cacheOptions.bypass_cache,
    };
    
    const startTime = Date.now();
    let cacheHit = false;
    
    try {
      // Check cache first unless bypass is requested
      if (!scrapeOptions.bypass_cache && scraperCache.isReady()) {
        const cachedData = await scraperCache.get(url, { 
          ...this.cacheOptions,
          bypass_cache: scrapeOptions.bypass_cache
        });
        
        if (cachedData && !cachedData.is_expired) {
          console.log(`${this.name}: Using cached data for ${url} (hit count: ${cachedData.cache_hit_count})`);
          cacheHit = true;
          monitor.recordCacheAccess(true);
          return cachedData.content;
        } else {
          monitor.recordCacheAccess(false);
        }
      }
      
      console.log(`Scraping ${url} with ${this.name} scraper`);
      
      // Apply rate limiting before making the request
      const rateLimitStart = Date.now();
      await globalRateLimiter.waitForRateLimit(url);
      const waitTime = Date.now() - rateLimitStart;
      
      if (waitTime > 10) { // Only record if we actually waited
        monitor.recordRateLimit(waitTime);
      }
      
      // Fetch the page content
      const response = await this.fetchPage(url);
      const html = await response.text();
      
      // Parse the HTML
      const $ = parseHtml(html);
      
      // Extract job data
      let data = await this.extractData($, url);
      
      // If scraper-specific extraction fails, fall back to generic extraction
      if (!data.title || !data.company || !data.description) {
        console.log(`${this.name}: Specific extraction failed, using generic extraction`);
        data = extractJobData($, url);
      }
      
      // Validate and clean data
      data = validateJobData(data, url, html);
      data = cleanJobData(data);
      
      // Populate scraper metadata
      data.scraper = this.name;
      data.url = url;
      
      // Store in cache if not bypassing
      if (!scrapeOptions.bypass_cache && scraperCache.isReady()) {
        try {
          await scraperCache.set(
            url, 
            data, 
            this.name, 
            this.cacheOptions,
            response.status,
            Object.fromEntries(response.headers.entries())
          );
          console.log(`${this.name}: Stored data in cache for ${url}`);
        } catch (error) {
          console.error("Error storing cache:", error);
          monitor.recordCacheAccess(false, true); // Record cache error
          // Continue even if caching fails
        }
      }
      
      return data;
    } catch (error) {
      console.error(`Error scraping ${url} with ${this.name} scraper:`, error);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      if (!cacheHit) { // Don't record scraper metrics for cache hits
        monitor.recordScrape(this.name, duration, true, url);
      }
    }
  }
  
  /**
   * Fetches the page content
   * Override in subclasses for scraper-specific fetch behavior
   * 
   * @param url URL to fetch
   * @returns Response object
   */
  protected async fetchPage(url: string): Promise<Response> {
    return await fetchWithRetry(url, {
      // Scraper-specific options can be added in subclasses
    });
  }
  
  /**
   * Extracts job data using scraper-specific logic
   * Override in subclasses for custom extraction behavior
   * 
   * @param $ Cheerio instance with parsed HTML
   * @param url Original URL that was scraped
   * @returns Scraped job data
   */
  protected async extractData($: any, url: string): Promise<ScrapedData> {
    // Base implementation defaults to generic extraction
    // Specific scrapers should override this method
    return extractJobData($, url);
  }
}
