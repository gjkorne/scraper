import { Scraper, ScrapedData } from "../types/index.ts";
import { fetchWithRetry, isValidUrl, createError } from "../utils/fetch.ts";
import { 
  parseHtml, 
  extractJobData, 
  validateJobData, 
  cleanJobData 
} from "../utils/html.ts";

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
   * @returns Scraped job data
   */
  async scrape(url: string): Promise<ScrapedData> {
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
      
      // Fetch the page
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
   * @param $ Cheerio instance
   * @param url Original URL
   * @returns Scraped job data
   */
  protected async extractData($: CheerioAPI, url: string): Promise<ScrapedData> {
    // Default implementation uses the generic extraction
    return extractJobData($, url);
  }
}
