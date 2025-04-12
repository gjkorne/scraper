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
}

/**
 * HTTP headers for scraping requests
 */
export interface ScraperHeaders {
  'User-Agent': string;
  'Accept': string;
  'Accept-Language': string;
  'Referer': string;
  'DNT': string;
  'Connection': string;
  'Upgrade-Insecure-Requests': string;
  'Cache-Control'?: string;
  'Pragma'?: string;
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
