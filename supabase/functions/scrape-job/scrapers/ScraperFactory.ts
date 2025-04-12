import { Scraper } from "../types/index.ts";
import { GenericScraper } from "./GenericScraper.ts";

/**
 * Factory class for managing and selecting the appropriate scraper
 */
export class ScraperFactory {
  private scrapers: Scraper[] = [];
  private genericScraper: GenericScraper;
  
  /**
   * Creates a new ScraperFactory instance
   */
  constructor() {
    this.genericScraper = new GenericScraper();
  }
  
  /**
   * Registers a scraper with the factory
   * 
   * @param scraper The scraper to register
   * @returns The factory instance for chaining
   */
  register(scraper: Scraper): ScraperFactory {
    this.scrapers.push(scraper);
    return this;
  }
  
  /**
   * Gets the appropriate scraper for the given URL
   * 
   * @param url The URL to get a scraper for
   * @returns The best matching scraper
   */
  getScraper(url: string): Scraper {
    // Find the first scraper that can handle this URL
    const scraper = this.scrapers.find(s => s.canHandle(url));
    
    // Fall back to the generic scraper if no specific scraper is found
    return scraper || this.genericScraper;
  }
}
