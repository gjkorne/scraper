import { Scraper } from "../types/index.ts";
import { LinkedInScraper } from "./LinkedInScraper.ts";
import { GreenhouseScraper } from "./GreenhouseScraper.ts";
import { WorkdayScraper } from "./WorkdayScraper.ts";
import { BuseyScraper } from "./BuseyScraper.ts";
import { GenericScraper } from "./GenericScraper.ts";
import { IndeedScraper } from "./IndeedScraper.ts";
import { GlassdoorScraper } from "./GlassdoorScraper.ts";

/**
 * Factory for creating and managing scraper instances
 */
export class ScraperFactory {
  private scrapers: Scraper[] = [];
  private genericScraper: Scraper;
  
  constructor() {
    // Initialize with default scrapers
    this.genericScraper = new GenericScraper();
    
    this.register(new LinkedInScraper())
        .register(new GreenhouseScraper())
        .register(new WorkdayScraper())
        .register(new BuseyScraper())
        .register(new IndeedScraper())
        .register(new GlassdoorScraper());
  }
  
  /**
   * Register a new scraper
   */
  register(scraper: Scraper): ScraperFactory {
    this.scrapers.push(scraper);
    return this;
  }
  
  /**
   * Get an appropriate scraper for a URL
   */
  getScraper(url: string): Scraper {
    const scraper = this.scrapers.find(s => s.canHandle(url));
    
    if (scraper) {
      console.log(`Using ${scraper.name} scraper for ${url}`);
      return scraper;
    }
    
    console.log(`No specific scraper found for ${url}, using GenericScraper`);
    return this.genericScraper;
  }
  
  /**
   * Get all registered scrapers
   */
  getAllScrapers(): Scraper[] {
    return [...this.scrapers, this.genericScraper];
  }
  
  /**
   * Get scaper by name
   */
  getScraperByName(name: string): Scraper | undefined {
    if (name === this.genericScraper.name) {
      return this.genericScraper;
    }
    return this.scrapers.find(s => s.name === name);
  }
}
