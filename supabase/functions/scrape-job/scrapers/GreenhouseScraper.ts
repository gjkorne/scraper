import { BaseScraper } from "./BaseScraper.ts";
import { ScrapedData } from "../types/index.ts";
import { CheerioAPI } from "npm:cheerio@1.0.0-rc.12";

/**
 * Greenhouse job posting scraper
 */
export class GreenhouseScraper extends BaseScraper {
  readonly name = "Greenhouse";
  
  protected readonly domainPatterns = [
    /greenhouse\.io/i,
    /boards\.greenhouse\.io/i
  ];
  
  /**
   * Extracts job data using Greenhouse-specific selectors
   */
  protected async extractData($: CheerioAPI, url: string): Promise<ScrapedData> {
    const title = $('.app-title').text().trim() ||
                  $('h1.job-title').text().trim() ||
                  $('h1:first').text().trim();

    const company = $('.company-name').text().trim() ||
                   $('.employer-info h2').text().trim() ||
                   $('meta[property="og:site_name"]').attr('content')?.trim() || '';

    const description = $('#content').text().trim() ||
                       $('.job-description').text().trim() ||
                       $('#job_description').text().trim();
    
    return { title, company, description };
  }
}
