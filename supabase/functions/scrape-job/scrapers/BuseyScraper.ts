import { BaseScraper } from "./BaseScraper.ts";
import { ScrapedData } from "../types/index.ts";
import { CheerioAPI } from "npm:cheerio@1.0.0-rc.12";

/**
 * Busey Bank job posting scraper
 */
export class BuseyScraper extends BaseScraper {
  readonly name = "Busey";
  
  protected readonly domainPatterns = [
    /busey\.com/i,
    /busey\.bank/i
  ];
  
  /**
   * Extracts job data using Busey-specific selectors and logic
   */
  protected async extractData($: CheerioAPI, url: string): Promise<ScrapedData> {
    // Extract title from the URL if it's in the expected format
    let title = '';
    const urlParts = url.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    if (lastPart.includes('_')) {
      title = lastPart.split('_')[0]
        .replace(/([A-Z])/g, ' $1') // Add spaces before capital letters
        .replace(/-/g, ' ') // Replace hyphens with spaces
        .trim();
    }

    // If URL parsing didn't work, try HTML selectors
    if (!title) {
      const titleSelectors = [
        'h1',
        '.job-title',
        '.position-title',
        '#job-title',
        '.job-header h1',
        '.job-details h1',
        'title'
      ];

      for (const selector of titleSelectors) {
        const element = $(selector);
        if (element.length) {
          title = element.text().trim();
          break;
        }
      }
    }

    // Set company name directly since we know it's Busey Bank
    const company = 'Busey Bank';

    // Extract description
    let description = '';
    const descriptionSelectors = [
      '#job-description',
      '.job-description',
      '.job-details-description',
      '.position-description',
      '.description-container',
      'main',
      'article',
      // Broader selectors as fallback
      'div[class*="description"]',
      'div[class*="details"]',
      'div[class*="content"]'
    ];

    for (const selector of descriptionSelectors) {
      const element = $(selector);
      if (element.length) {
        description = element.text()
          .trim()
          .replace(/\s+/g, ' ');
        
        if (description.length > 50) {
          break;
        }
      }
    }

    // If we still don't have a description, try getting all text content
    if (!description) {
      description = $('body').text()
        .trim()
        .replace(/\s+/g, ' ');
    }
    
    return { title, company, description };
  }
}
