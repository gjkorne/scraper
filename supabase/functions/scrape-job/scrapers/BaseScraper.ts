import { Scraper, ScrapedData } from "../types/index.ts";
import { fetchWithRetry, isValidUrl, createError } from "../utils/fetch.ts";
import { 
  parseHtml, 
  extractJobData, 
  validateJobData, 
  cleanJobData 
} from "../utils/html.ts";
import { scraperCache, CacheOptions } from "../utils/cache.ts";

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
    try {
      // Validate URL
      if (!isValidUrl(url)) {
        throw new Error(JSON.stringify(createError(
          'INVALID_URL',
          'Invalid URL format',
          `URL: ${url}`,
          'Please provide a valid job posting URL'
        )));
      }
      
      // Determine if we should bypass cache
      const bypass_cache = options?.bypass_cache ?? this.cacheOptions.bypass_cache;
      
      // Check cache if enabled
      if (!bypass_cache && scraperCache.isReady()) {
        const cachedData = await scraperCache.get(url, { 
          ...this.cacheOptions,
          bypass_cache
        });
        
        if (cachedData && !cachedData.is_expired) {
          console.log(`${this.name}: Using cached data for ${url} (hit count: ${cachedData.cache_hit_count})`);
          return cachedData.content;
        }
      }
      
      // Cache miss or bypass, fetch the page
      console.log(`${this.name}: Cache miss or bypass for ${url}, fetching fresh data`);
      const response = await this.fetchPage(url);
      const html = await response.text();
      
      // Parse HTML and extract data
      const $ = parseHtml(html);
      
      // Allow scraper-specific extraction logic
      let data = await this.extractData($, url);
      
      // If scraper-specific extraction fails, fall back to generic extraction
      if (!data.title || !data.company || !data.description) {
        console.log(`${this.name}: Specific extraction failed, using generic extraction`);
        data = extractJobData($, url);
      }
      
      // Validate and clean data
      data = validateJobData(data, url, html);
      data = cleanJobData(data);
      
      // Store successful result in cache
      if (scraperCache.isReady() && !bypass_cache) {
        // Extract relevant headers for cache validation
        const headers: Record<string, string> = {};
        if (response.headers.has('etag')) {
          headers['etag'] = response.headers.get('etag')!;
        }
        if (response.headers.has('last-modified')) {
          headers['last-modified'] = response.headers.get('last-modified')!;
        }
        
        await scraperCache.set(
          url, 
          data, 
          this.name, 
          this.cacheOptions,
          response.status,
          headers
        );
        console.log(`${this.name}: Stored data in cache for ${url}`);
      }
      
      return data;
    } catch (error) {
      // Enhance the error with scraper name
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`${this.name}: ${errorMessage}`);
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
