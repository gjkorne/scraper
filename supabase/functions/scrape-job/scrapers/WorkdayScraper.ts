import { BaseScraper } from "./BaseScraper.ts";
import { ScrapedData } from "../types/index.ts";
import { CheerioAPI } from "npm:cheerio@1.0.0-rc.12";

/**
 * Workday job posting scraper
 */
export class WorkdayScraper extends BaseScraper {
  readonly name = "Workday";
  
  protected readonly domainPatterns = [
    /workday\.com/i,
    /myworkdayjobs\.com/i
  ];
  
  /**
   * Extracts job data using Workday-specific selectors
   */
  protected async extractData($: CheerioAPI, url: string): Promise<ScrapedData> {
    const title = $('[data-automation-id="jobPostingHeader"]').text().trim() ||
                  $('h1:first').text().trim() ||
                  $('[class*="job-title"]').first().text().trim();

    const company = $('[data-automation-id="jobPostingCompany"]').text().trim() ||
                   $('[class*="company-name"]').first().text().trim() ||
                   $('meta[property="og:site_name"]').attr('content')?.trim() || '';

    const description = $('[data-automation-id="jobPostingDescription"]').text().trim() ||
                       $('.job-description').text().trim() ||
                       $('main').text().trim();
    
    return { title, company, description };
  }
}
