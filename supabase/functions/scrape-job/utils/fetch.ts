import { FetchOptions, ScraperError } from "../types/index.ts";

/**
 * Default headers used for scraping requests
 */
export const DEFAULT_HEADERS: HeadersInit = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Referer': 'https://www.google.com/',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
};

/**
 * Default options for fetch requests
 */
export const DEFAULT_FETCH_OPTIONS: FetchOptions = {
  headers: DEFAULT_HEADERS as any,
  retries: 3,
  retryDelay: 1000,
  redirect: 'follow'
};

/**
 * Fetches a URL with configurable retry logic
 * 
 * @param url The URL to fetch
 * @param options Fetch options including retry configuration
 * @returns Response object from successful fetch
 * @throws ScraperError with details on failure
 */
export async function fetchWithRetry(
  url: string, 
  options: Partial<FetchOptions> = {}
): Promise<Response> {
  // Merge default options with provided options
  const fullOptions: FetchOptions = {
    ...DEFAULT_FETCH_OPTIONS,
    ...options,
    headers: {
      ...DEFAULT_FETCH_OPTIONS.headers,
      ...(options.headers || {})
    }
  };
  
  const { retries = 3, retryDelay = 1000 } = fullOptions;
  let attemptsLeft = retries;
  let lastError: Error | null = null;

  // Remove custom properties from options before passing to fetch
  const { retries: _, retryDelay: __, ...fetchOptions } = fullOptions;

  while (attemptsLeft > 0) {
    try {
      const response = await fetch(url, fetchOptions);
      
      if (response.ok) {
        return response;
      }
      
      throw new Error(`Failed to fetch page (Status: ${response.status})`);
    } catch (error) {
      lastError = error as Error;
      attemptsLeft--;
      
      if (attemptsLeft > 0) {
        // Use progressive backoff for retries
        const backoffDelay = retryDelay * (retries - attemptsLeft + 1);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }

  // If we've exhausted all retries, throw a structured error
  const scraperError: ScraperError = {
    code: 'FETCH_FAILED',
    message: `Failed to fetch the job posting after ${retries} attempts`,
    technicalDetails: lastError?.message || 'Unknown error',
    suggestion: 'The site may be blocking automated requests. Try accessing the page directly in your browser.'
  };
  
  throw new Error(JSON.stringify(scraperError));
}

/**
 * Validates a URL string format
 * 
 * @param url URL string to validate
 * @returns True if URL format is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if HTML content is valid
 * 
 * @param html HTML content to validate
 * @returns True if content appears to be valid HTML
 */
export function isValidHtml(html: string): boolean {
  return (
    html.toLowerCase().includes('<!doctype html') || 
    html.toLowerCase().includes('<html')
  );
}

/**
 * Creates a standardized error object
 * 
 * @param code Error code
 * @param message User-friendly error message
 * @param technicalDetails Technical details for debugging
 * @param suggestion Suggested action for the user
 * @returns Structured error object
 */
export function createError(
  code: string,
  message: string,
  technicalDetails?: string,
  suggestion?: string
): ScraperError {
  return {
    code,
    message,
    technicalDetails,
    suggestion
  };
}
