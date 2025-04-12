import { BaseScraper } from "./BaseScraper.ts";
import { ScrapedData } from "../types/index.ts";
import { cleanText } from "../utils/html.ts";

/**
 * Scraper for Glassdoor job postings
 */
export class GlassdoorScraper extends BaseScraper {
  readonly name = "Glassdoor";
  
  // Glassdoor domain patterns
  protected readonly domainPatterns = [
    /glassdoor\.com/i,
    /glassdoor\.[a-z]{2,3}/i, // country-specific domains
  ];
  
  // Glassdoor-specific cache options
  protected readonly cacheOptions = {
    ttl_hours: 24, // 24-hour cache
    bypass_cache: false
  };
  
  /**
   * Extract job data from Glassdoor HTML
   */
  protected async extractData($: any, url: string): Promise<ScrapedData> {
    try {
      // Job title - multiple possible selectors based on Glassdoor's structure
      let title = cleanText($('.job-title').text()) ||
                  cleanText($('[data-test="job-title"]').text()) ||
                  cleanText($('h1.title').text()) ||
                  cleanText($('h2.title').text());
      
      // Company name
      let company = cleanText($('[data-test="employer-name"]').text()) ||
                    cleanText($('.EmployerProfile__name').text()) ||
                    cleanText($('.empInfo').text()) ||
                    cleanText($('.company').text());
      
      // Location
      const location = cleanText($('[data-test="location"]').text()) ||
                       cleanText($('.location').text()) ||
                       cleanText($('.subtle.ib').text());
      
      // Salary if available
      const salary = cleanText($('[data-test="detailSalary"]').text()) ||
                     cleanText($('.salary').text()) ||
                     cleanText($('.css-16u98uf').text());
      
      // Job type
      const jobType = cleanText($('[data-test="job-type"]').text()) ||
                      cleanText($('.css-1vtbvzd').text());
      
      // Description - might be in different containers
      const description = cleanText($('.jobDescriptionContent').html()) ||
                          cleanText($('[data-test="description"]').html()) ||
                          cleanText($('.desc').html());
      
      // Extract potential date posted
      const datePosted = cleanText($('.minor').text()) ||
                        cleanText($('[data-test="posted-date"]').text()) ||
                        cleanText($('.css-13xcpqx').text());
      
      // Extract job industry
      const industry = cleanText($('[data-test="job-industry"]').text()) ||
                      cleanText($('.css-1plidt9').text());
      
      // Requirements and skills extraction
      const requirements: string[] = [];
      const skills: string[] = [];
      
      // Look for sections that might contain requirements
      $('p').each((_: number, el: any) => {
        const text = cleanText($(el).text());
        if (
          text.includes('Qualification') || 
          text.includes('Requirement') || 
          text.includes('experience required') ||
          text.includes('skills required')
        ) {
          // The requirements might be in the next element's list
          const nextElem = $(el).next();
          if (nextElem.is('ul') || nextElem.is('ol')) {
            nextElem.find('li').each((_: number, li: any) => {
              const reqText = cleanText($(li).text());
              requirements.push(reqText);
              
              // Extract skills from requirements
              if (reqText.includes('experience with') || reqText.includes('knowledge of')) {
                const parts = reqText.split(/[,;]/).map(p => p.trim());
                parts.forEach(part => {
                  if (part.length > 2 && !part.includes('year') && !part.includes('experience')) {
                    skills.push(part);
                  }
                });
              }
            });
          } else {
            requirements.push(text);
          }
        }
        
        // Look for skills paragraphs
        if (
          text.includes('skill') || 
          text.includes('proficient in') || 
          text.includes('experience with')
        ) {
          const skillText = text.replace(/^.*?:/, '').trim();
          skillText.split(/[,;.]/).forEach(part => {
            const skill = part.trim();
            if (skill.length > 2 && !skill.includes('etc')) {
              skills.push(skill);
            }
          });
        }
      });
      
      // Extract benefits section
      const benefits: string[] = [];
      $('div').each((_: number, el: any) => {
        const header = $(el).find('h2, h3, h4').text();
        if (
          header.includes('Benefit') || 
          header.includes('Perks') || 
          header.includes('Compensation')
        ) {
          $(el).find('li').each((_: number, li: any) => {
            benefits.push(cleanText($(li).text()));
          });
        }
      });
      
      // Handle cases where essential data might be missing
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
        industry,
        url,
        scraper: this.name,
        requirements,
        benefits,
        skills,
      };
    } catch (error) {
      console.error(`Error extracting Glassdoor job data:`, error);
      throw error;
    }
  }
}
