import { load, CheerioAPI } from "npm:cheerio@1.0.0-rc.12";
import { ScrapedData } from "../types/index.ts";

/**
 * Cleans up DOM by removing scripts, styles, and hidden elements
 * 
 * @param $ Cheerio instance
 * @returns The same Cheerio instance with elements removed
 */
export function cleanDom($: CheerioAPI): CheerioAPI {
  // Remove script tags and hidden elements to clean up the DOM
  $('script').remove();
  $('style').remove();
  $('[style*="display: none"]').remove();
  $('[style*="display:none"]').remove();
  $('[hidden]').remove();
  
  return $;
}

/**
 * Loads and cleans HTML content using Cheerio
 * 
 * @param html Raw HTML content
 * @returns Cheerio instance with cleaned DOM
 */
export function parseHtml(html: string): CheerioAPI {
  const $ = load(html);
  return cleanDom($);
}

/**
 * Extracts JSON-LD data from HTML that might contain job information
 * 
 * @param $ Cheerio instance
 * @returns Parsed JSON-LD data or null if not found/invalid
 */
export function extractJsonLd($: CheerioAPI): any | null {
  try {
    const jsonLdScripts = $('script[type="application/ld+json"]').toArray();
    
    if (!jsonLdScripts.length) {
      return null;
    }
    
    // Find first valid JSON-LD that looks like a job posting
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse($(script).html() || '');
        
        // Check if this looks like job posting data
        if (
          data && (
            data['@type'] === 'JobPosting' || 
            data.jobTitle || 
            data.title || 
            data.hiringOrganization || 
            data.description
          )
        ) {
          return data;
        }
      } catch {
        // Skip invalid JSON
        continue;
      }
    }
  } catch (e) {
    console.error('JSON-LD parsing failed:', e);
  }
  
  return null;
}

/**
 * Attempts to extract job title using various selectors
 * 
 * @param $ Cheerio instance
 * @param jsonLd Optional JSON-LD data to check first
 * @returns Job title or empty string if not found
 */
export function extractTitle($: CheerioAPI, jsonLd?: any): string {
  // Try JSON-LD first if provided
  if (jsonLd && (jsonLd.jobTitle || jsonLd.title)) {
    return (jsonLd.jobTitle || jsonLd.title).trim();
  }
  
  // Common title selectors in order of specificity
  const titleSelectors = [
    'h1[class*="title" i]',
    'h1[class*="job" i]',
    'h1[class*="position" i]',
    'div[class*="job-title" i]',
    '.posting-header h1',
    '[data-testid*="title" i]',
    '[data-testid*="job" i]',
    '[data-qa*="title" i]',
    '[data-qa*="job" i]',
    'meta[property="og:title"]',
    'meta[name="title"]',
    '.job-header h1',
    '.job-details h1',
    '#job-title',
    '.position-title',
    'h1',
    'h2',
    'title'
  ];

  for (const selector of titleSelectors) {
    const element = $(selector);
    const content = element.is('meta') ? element.attr('content') : element.text();
    if (content) {
      return content.trim().replace(/\s+/g, ' ');
    }
  }
  
  return '';
}

/**
 * Attempts to extract company name using various selectors
 * 
 * @param $ Cheerio instance
 * @param url Original URL for domain-based fallbacks
 * @param jsonLd Optional JSON-LD data to check first
 * @returns Company name or empty string if not found
 */
export function extractCompany($: CheerioAPI, url: string, jsonLd?: any): string {
  // Try JSON-LD first if provided
  if (jsonLd) {
    const org = jsonLd.hiringOrganization || jsonLd.organization || jsonLd.publisher;
    if (org) {
      return typeof org === 'string' ? org : org.name || '';
    }
  }
  
  // URL-based checks
  if (url.includes('busey.com')) {
    return 'Busey Bank';
  }
  
  // Common company selectors in order of specificity
  const companySelectors = [
    '[class*="company-name" i]',
    '[class*="employer" i]',
    '[class*="organization" i]',
    '[data-testid*="company" i]',
    '[data-qa*="company" i]',
    'meta[property="og:site_name"]',
    '.company-info',
    '.employer-info',
    '.company-header',
    '#company-name',
    '.organization-name'
  ];

  for (const selector of companySelectors) {
    const element = $(selector);
    const content = element.is('meta') ? element.attr('content') : element.text();
    if (content) {
      return content.trim().replace(/\s+/g, ' ');
    }
  }
  
  // Fallback: try to extract from the URL
  try {
    const hostname = new URL(url).hostname;
    const domainParts = hostname.split('.');
    if (domainParts.length >= 2) {
      // Use the second-level domain as company name
      return domainParts[domainParts.length - 2]
        .charAt(0).toUpperCase() + domainParts[domainParts.length - 2].slice(1);
    }
  } catch {
    // Ignore URL parsing errors
  }
  
  return '';
}

/**
 * Attempts to extract job description using various selectors
 * 
 * @param $ Cheerio instance
 * @param jsonLd Optional JSON-LD data to check first
 * @returns Job description or empty string if not found
 */
export function extractDescription($: CheerioAPI, jsonLd?: any): string {
  // Try JSON-LD first if provided
  if (jsonLd && jsonLd.description) {
    return jsonLd.description.trim().replace(/\s+/g, ' ');
  }
  
  // Common description selectors in order of specificity
  const descriptionSelectors = [
    '[class*="job-description" i]',
    '[class*="description" i]',
    '[data-testid*="description" i]',
    '[data-qa*="description" i]',
    'meta[name="description"]',
    'meta[property="og:description"]',
    '#job-description',
    '.job-details-description',
    '.position-description',
    '.description-container',
    'main',
    'article',
    'div[class*="details" i]',
    'div[class*="content" i]'
  ];

  for (const selector of descriptionSelectors) {
    const element = $(selector);
    const content = element.is('meta') ? element.attr('content') : element.text();
    
    if (content) {
      const cleaned = content.trim()
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n');
      
      // Only use this content if it's long enough to be a real description
      if (cleaned.length > 50) {
        return cleaned;
      }
    }
  }
  
  // Last resort: use the main content
  return $('body').text().trim()
    .replace(/\s+/g, ' ')
    .substring(0, 5000); // Limit to 5000 chars as a safeguard
}

/**
 * Extract job data from HTML
 * @param $ Cheerio instance
 * @param url URL of the job posting
 * @returns Extracted job data
 */
export function extractJobData($: any, url: string): ScrapedData {
  try {
    // Try to extract title from common selectors
    const title = 
      $('h1').first().text() ||
      $('title').text().split('|')[0] ||
      $('title').text().split('-')[0] ||
      'Unknown Position';
    
    // Try to extract company name
    let company = '';
    $('.company, .employer, [itemprop="hiringOrganization"], [data-company]').each((_: number, el: any) => {
      if (!company) {
        company = $(el).text().trim();
      }
    });
    
    // Fallback to title tag's second part
    if (!company) {
      const titleParts = $('title').text().split(/[\|\-]/);
      if (titleParts.length > 1) {
        company = titleParts[1].trim();
      }
    }
    
    // Fallback to unknown
    if (!company) {
      company = 'Unknown Company';
    }
    
    // Extract job description - look for common containers
    let description = '';
    $('.description, .job-description, [itemprop="description"]').each((_: number, el: any) => {
      if (!description) {
        description = $(el).text().trim();
      }
    });
    
    // Fallback to largest text container
    if (!description) {
      let maxLength = 0;
      $('div, section, article').each((_: number, el: any) => {
        const text = $(el).text().trim();
        if (text.length > maxLength && text.length > 200) {
          maxLength = text.length;
          description = text;
        }
      });
    }
    
    return {
      title: title.trim(),
      company: company,
      description: description,
      url: url,
      scraper: "Generic" // This will be overridden by the specific scraper
    };
  } catch (error) {
    console.error('Error extracting job data:', error);
    return {
      title: 'Unknown Position',
      company: 'Unknown Company',
      description: 'Failed to extract job description',
      url: url,
      scraper: "Generic"
    };
  }
}

/**
 * Clean and normalize job data
 * @param data Job data to clean
 * @returns Cleaned job data
 */
export function cleanJobData(data: ScrapedData): ScrapedData {
  return {
    ...data,
    title: data.title.replace(/\s+/g, ' ').trim(),
    company: data.company.replace(/\s+/g, ' ').trim(),
    description: data.description.replace(/\s+/g, ' ').trim(),
    // Keep existing url and scraper fields
    url: data.url,
    scraper: data.scraper
  };
}

/**
 * Creates a detailed error message when extraction fails
 * 
 * @param url URL that was scraped
 * @param html HTML content
 * @param missingFields Array of field names that couldn't be extracted
 * @returns Detailed error message
 */
export function createExtractionError(
  url: string, 
  html: string, 
  missingFields: string[]
): Error {
  // Create a sanitized version of the HTML for debugging
  const debugHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .substring(0, 1000) + '...';

  return new Error(
    `Could not extract the following required fields: ${missingFields.join(', ')}.\n\n` +
    `Debug information:\n` +
    `1. URL: ${url}\n` +
    `2. Page contains valid HTML: ${html.toLowerCase().includes('<!doctype html') || html.toLowerCase().includes('<html')}\n` +
    `3. Content preview:\n${debugHtml}\n\n` +
    `This might be because:\n` +
    `1. The page requires JavaScript to load its content\n` +
    `2. The page requires authentication\n` +
    `3. The content structure is non-standard\n\n` +
    `Please try:\n` +
    `1. Using a direct link to the job posting\n` +
    `2. Ensuring the URL is publicly accessible\n` +
    `3. Manually entering the job details`
  );
}

/**
 * Validates extracted job data and throws detailed errors if invalid
 * 
 * @param data Extracted job data
 * @param url URL source for error messages
 * @param html HTML content for error messages
 * @returns Valid job data
 * @throws Error with details if validation fails
 */
export function validateJobData(
  data: ScrapedData, 
  url: string, 
  html: string
): ScrapedData {
  const missingFields = [];
  if (!data.title) missingFields.push('job title');
  if (!data.company) missingFields.push('company name');
  if (!data.description) missingFields.push('job description');

  if (missingFields.length > 0) {
    throw createExtractionError(url, html, missingFields);
  }

  return data;
}

/**
 * Clean text by removing extra whitespace, newlines, etc.
 * @param text Text to clean
 * @returns Cleaned text
 */
export function cleanText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/\s+/g, ' ')     // Replace multiple whitespace with single space
    .replace(/\n+/g, ' ')     // Replace newlines with spaces
    .replace(/\t+/g, ' ')     // Replace tabs with spaces
    .trim();
}
