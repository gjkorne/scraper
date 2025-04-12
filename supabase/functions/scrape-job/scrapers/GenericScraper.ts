import { BaseScraper } from "./BaseScraper.ts";
import { ScrapedData } from "../types/index.ts";
import { CheerioAPI } from "npm:cheerio@1.0.0-rc.12";
import { extractJobData } from "../utils/html.ts";

/**
 * Generic scraper for any job posting site
 * Used as a fallback when no specific scraper matches the URL
 */
export class GenericScraper extends BaseScraper {
  readonly name = "Generic";
  
  // This scraper can handle any URL (as a fallback)
  protected readonly domainPatterns = [/.*/];
  
  /**
   * Generic implementation uses the common extraction utilities
   */
  protected async extractData($: CheerioAPI, url: string): Promise<ScrapedData> {
    return extractJobData($, url);
  }
}
