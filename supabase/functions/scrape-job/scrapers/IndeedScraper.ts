import { BaseScraper } from "./BaseScraper.ts";
import { ScrapedData } from "../types/index.ts";
import { cleanText } from "../utils/html.ts";

/**
 * Scraper for Indeed job postings
 */
export class IndeedScraper extends BaseScraper {
  readonly name = "Indeed";
  
  // Indeed domain patterns
  protected readonly domainPatterns = [
    /indeed\.com/i,
    /indeed\.co\.[a-z]{2}/i, // country-specific domains like indeed.co.uk
    /indeed\.[a-z]{2}/i,     // country-specific domains like indeed.fr
  ];
  
  // Indeed-specific cache options
  protected readonly cacheOptions = {
    ttl_hours: 18, // 18-hour cache
    bypass_cache: false
  };
  
  /**
   * Extract job data from Indeed HTML
   */
  protected async extractData($: any, url: string): Promise<ScrapedData> {
    try {
      // Job title - multiple possible selectors based on Indeed's varying layouts
      let title = cleanText($('.jobsearch-JobInfoHeader-title').text()) ||
                  cleanText($('h1.jobTitle').text()) ||
                  cleanText($('h1[data-testid="jobDetailTitle"]').text()) ||
                  cleanText($('h1.icl-u-xs-mb--xs').text());
      
      // Company name
      let company = cleanText($('.jobsearch-InlineCompanyRating-companyName').text()) ||
                    cleanText($('div[data-company-name="true"]').text()) ||
                    cleanText($('.icl-u-lg-mr--sm').text());
                   
      // Location
      const location = cleanText($('.jobsearch-JobInfoHeader-subtitle .jobsearch-JobInfoHeader-locationText').text()) ||
                       cleanText($('[data-testid="jobsearch-JobInfoHeader-companyLocationText"]').text()) ||
                       cleanText($('div[data-testid="jobLocationText"]').text());
      
      // Salary if available
      const salary = cleanText($('.jobsearch-JobMetadataHeader-item').text()) ||
                     cleanText($('span[data-testid="jobsearch-JobMetadataHeader-salary"]').text()) ||
                     cleanText($('div[id="salaryInfoAndJobType"] span').text());
      
      // Job type
      const jobTypeElem = $('.jobsearch-JobMetadataHeader-item').filter((i: number, el: any) => {
        return $(el).text().includes('job') || $(el).text().includes('time');
      });
      const jobType = jobTypeElem.length ? cleanText(jobTypeElem.text()) : undefined;
      
      // Full description
      const description = cleanText($('#jobDescriptionText').html()) ||
                          cleanText($('div[id="jobDescriptionText"]').html()) ||
                          cleanText($('.jobsearch-jobDescriptionText').html());
      
      // Extract requirements and skills from the description
      const requirements: string[] = [];
      const skills: string[] = [];
      
      // Look for bullet points or numbered lists
      $('ul li, ol li').each((_: number, el: any) => {
        const text = cleanText($(el).text());
        
        // Check if it seems like a requirement
        if (
          text.includes('year') || 
          text.includes('experience') || 
          text.includes('degree') || 
          text.includes('qualification') ||
          text.includes('proficiency')
        ) {
          requirements.push(text);
          
          // Extract potential skills from requirements
          text.split(/[,.]/).forEach(part => {
            const trimmed = part.trim();
            if (
              trimmed.length > 2 && 
              !trimmed.includes('year') && 
              !trimmed.includes('experience') &&
              /^[A-Za-z0-9+#.\-_]+$/.test(trimmed) // likely a skill/technology
            ) {
              skills.push(trimmed);
            }
          });
        }
      });
      
      // Extract dates
      const datePosted = cleanText($('span[data-testid="jobsearch-JobMetadataFooter-datePosted"]').text())
        .replace('Posted', '')
        .trim();
      
      // Benefits section - often in specific divs
      const benefits: string[] = [];
      $('.jobsearch-JobDescriptionSection-sectionItem').each((_: number, el: any) => {
        const heading = $(el).find('.jobsearch-JobDescriptionSection-sectionItemKey').text();
        if (heading.includes('Benefit')) {
          $(el).find('li').each((_: number, li: any) => {
            benefits.push(cleanText($(li).text()));
          });
        }
      });
      
      // Handle cases where both title and company might be empty due to JS rendering
      if (!title && !company && !description) {
        throw new Error('Could not extract job data - page might be JavaScript rendered');
      }
      
      // Fallbacks for essential fields
      title = title || 'Unknown Position';
      company = company || 'Unknown Company';
      
      // Construct result
      return {
        title,
        company,
        description,
        location,
        salary,
        jobType,
        datePosted,
        url,
        scraper: this.name,
        requirements,
        benefits,
        skills,
      };
    } catch (error) {
      console.error(`Error extracting Indeed job data:`, error);
      throw error;
    }
  }
}
