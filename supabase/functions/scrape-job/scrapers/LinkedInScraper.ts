import { BaseScraper } from "./BaseScraper.ts";
import { ScrapedData } from "../types/index.ts";
import { CheerioAPI } from "npm:cheerio@1.0.0-rc.12";

/**
 * LinkedIn job posting scraper
 */
export class LinkedInScraper extends BaseScraper {
  readonly name = "LinkedIn";
  
  protected readonly domainPatterns = [
    /linkedin\.com\/jobs/i,
    /linkedin\.com\/job/i
  ];
  
  /**
   * Extracts job data using LinkedIn-specific selectors
   */
  protected async extractData($: CheerioAPI, url: string): Promise<ScrapedData> {
    const title = $('.top-card-layout__title').text().trim() || 
                  $('h1').first().text().trim() ||
                  $('.job-details-jobs-unified-top-card__job-title').text().trim();
                  
    const company = $('.top-card-layout__company-name').text().trim() ||
                   $('.job-details-jobs-unified-top-card__company-name').text().trim() ||
                   $('.company-name').text().trim();
                   
    const description = $('.description__text').text().trim() ||
                       $('.job-details-jobs-unified-top-card__description-text').text().trim() ||
                       $('.job-description').text().trim();
    
    return { title, company, description };
  }
}
