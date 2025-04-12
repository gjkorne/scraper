import { BaseScraper } from "./BaseScraper.ts";
import { ScrapedData } from "../types/index.ts";
import { extractJobData } from "../utils/html.ts";

/**
 * Generic scraper for any job posting site
 * Used as a fallback when no specific scraper matches the URL
 */
export class GenericScraper extends BaseScraper {
  readonly name = "Generic";
  
  // This scraper can handle any URL (as a fallback)
  protected readonly domainPatterns = [/.*/];
  
  // Override caching behavior - shorter TTL for generic scrapers
  // since they might be less reliable
  protected readonly cacheOptions = {
    ttl_hours: 12, // 12-hour cache for generic scraper
    bypass_cache: false
  };
  
  /**
   * Generic implementation uses the common extraction utilities
   */
  protected async extractData($: any, url: string): Promise<ScrapedData> {
    return extractJobData($, url);
  }
}
