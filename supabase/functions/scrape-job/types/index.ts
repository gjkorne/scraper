/**
 * Type definitions for the job scraper
 */

/**
 * Data returned from a successful scrape
 */
export interface ScrapedData {
  title: string;
  company: string;
  description: string;
  location?: string;
  salary?: string;
  jobType?: string;
  datePosted?: string;
  industry?: string;
  url: string;
  scraper: string;
  keywords?: string[];
  skills?: string[];
  requirements?: string[];
  benefits?: string[];
  rawHtml?: string;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * HTTP headers for the scraper requests
 */
export interface ScraperHeaders {
  [key: string]: string;
  'User-Agent': string;
}

/**
 * Options for fetch requests
 */
export interface FetchOptions extends RequestInit {
  headers: ScraperHeaders;
  retries?: number;
  retryDelay?: number;
}

/**
 * Error response structure
 */
export interface ScraperError {
  code: string;
  message: string;
  technicalDetails?: string;
  suggestion?: string;
}

/**
 * Base interface for all scrapers
 */
export interface Scraper {
  /**
   * Determines if this scraper can handle the given URL
   */
  canHandle(url: string): boolean;
  
  /**
   * Scrapes job data from the given URL
   */
  scrape(url: string): Promise<ScrapedData>;
  
  /**
   * Name of the scraper for logging and debugging
   */
  readonly name: string;
}
