/**
 * Rate limiting utility for scrapers
 * Helps prevent getting blocked by job sites by limiting request rates
 */

/**
 * Configuration options for rate limiter
 */
export interface RateLimitOptions {
  // Maximum requests per minute (default: 10)
  requestsPerMinute?: number;
  
  // Time window in milliseconds (default: 60000 ms = 1 minute)
  windowMs?: number;
  
  // Whether to apply domain-specific rate limits (default: true)
  perDomain?: boolean;
}

/**
 * Default rate limit options
 */
const DEFAULT_RATE_LIMIT_OPTIONS: Required<RateLimitOptions> = {
  requestsPerMinute: 10,
  windowMs: 60 * 1000, // 1 minute in milliseconds
  perDomain: true,
};

/**
 * Simple in-memory rate limiter for Edge Functions
 * Tracks requests per domain and enforces limits
 */
export class RateLimiter {
  private options: Required<RateLimitOptions>;
  private requestTimestamps: Map<string, number[]> = new Map();
  
  constructor(options?: RateLimitOptions) {
    this.options = { ...DEFAULT_RATE_LIMIT_OPTIONS, ...options };
  }
  
  /**
   * Extract domain from URL for per-domain rate limiting
   */
  private getDomainKey(url: string): string {
    try {
      const urlObj = new URL(url);
      return this.options.perDomain ? urlObj.hostname : 'global';
    } catch (e) {
      // Fallback to global limit if URL parsing fails
      return 'global';
    }
  }
  
  /**
   * Check if rate limit is exceeded for the given URL
   * @returns true if rate limit exceeded, false otherwise
   */
  isRateLimited(url: string): boolean {
    const key = this.getDomainKey(url);
    const now = Date.now();
    const windowMs = this.options.windowMs;
    
    // Get existing timestamps for this domain
    let timestamps = this.requestTimestamps.get(key) || [];
    
    // Filter out timestamps outside the current window
    timestamps = timestamps.filter(timestamp => now - timestamp < windowMs);
    
    // Check if number of requests in window exceeds limit
    if (timestamps.length >= this.options.requestsPerMinute) {
      return true;
    }
    
    // Not rate limited, update the timestamps
    this.requestTimestamps.set(key, [...timestamps, now]);
    return false;
  }
  
  /**
   * Get time in milliseconds until rate limit resets
   * @returns milliseconds until next request slot is available
   */
  getTimeUntilReset(url: string): number {
    const key = this.getDomainKey(url);
    const timestamps = this.requestTimestamps.get(key) || [];
    
    if (timestamps.length === 0) {
      return 0; // No requests made yet
    }
    
    if (timestamps.length < this.options.requestsPerMinute) {
      return 0; // Under the limit
    }
    
    // Sort timestamps and find when the oldest timestamp will expire
    const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
    const oldestTimestamp = sortedTimestamps[0];
    const resetTime = oldestTimestamp + this.options.windowMs - Date.now();
    
    return Math.max(0, resetTime);
  }
  
  /**
   * Wait until rate limit allows a request to be made
   * @returns Promise that resolves when request can be made
   */
  async waitForRateLimit(url: string): Promise<void> {
    if (this.isRateLimited(url)) {
      const waitTime = this.getTimeUntilReset(url);
      
      if (waitTime > 0) {
        console.log(`Rate limited for ${url}. Waiting ${waitTime}ms before retrying...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  /**
   * Clear all rate limit data
   */
  reset(): void {
    this.requestTimestamps.clear();
  }
}

// Create a singleton instance to share across the application
export const globalRateLimiter = new RateLimiter();

/**
 * Higher-order function to wrap a function with rate limiting
 * @param fn The function to be rate limited
 * @param rateLimiter The rate limiter instance to use
 * @returns Rate-limited version of the function
 */
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  rateLimiter: RateLimiter = globalRateLimiter
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    // For now, we'll assume the first argument is always the URL
    // This could be made more flexible in the future
    const url = args[0] as string;
    
    await rateLimiter.waitForRateLimit(url);
    return await fn(...args);
  }) as T;
}
