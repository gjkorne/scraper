/**
 * Monitoring utilities for tracking scraper performance
 */

interface ScraperMetric {
  count: number;
  totalTime: number;
  min: number;
  max: number;
  errors: number;
}

interface CacheMetric {
  hits: number;
  misses: number;
  errors: number;
}

interface RateLimitMetric {
  limited: number;
  waitTime: number;
}

/**
 * Monitor class to track scraper performance metrics
 */
export class ScraperMonitor {
  private static instance: ScraperMonitor;
  
  // Track metrics by scraper name
  private scraperMetrics: Map<string, ScraperMetric> = new Map();
  
  // Track cache performance
  private cacheMetrics: CacheMetric = {
    hits: 0,
    misses: 0,
    errors: 0
  };
  
  // Track rate limiting
  private rateLimitMetrics: RateLimitMetric = {
    limited: 0,
    waitTime: 0
  };
  
  // Track requests by domain
  private domainRequests: Map<string, number> = new Map();
  
  // Private constructor for singleton
  private constructor() {}
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ScraperMonitor {
    if (!ScraperMonitor.instance) {
      ScraperMonitor.instance = new ScraperMonitor();
    }
    return ScraperMonitor.instance;
  }
  
  /**
   * Record a scraper operation with timing
   */
  public recordScrape(
    scraperName: string, 
    durationMs: number, 
    successful: boolean,
    url: string
  ): void {
    // Get or create scraper metrics
    let metrics = this.scraperMetrics.get(scraperName);
    if (!metrics) {
      metrics = {
        count: 0,
        totalTime: 0,
        min: Number.MAX_VALUE,
        max: 0,
        errors: 0
      };
      this.scraperMetrics.set(scraperName, metrics);
    }
    
    // Update metrics
    metrics.count += 1;
    metrics.totalTime += durationMs;
    metrics.min = Math.min(metrics.min, durationMs);
    metrics.max = Math.max(metrics.max, durationMs);
    
    if (!successful) {
      metrics.errors += 1;
    }
    
    // Track domain requests
    try {
      const domain = new URL(url).hostname;
      const count = this.domainRequests.get(domain) || 0;
      this.domainRequests.set(domain, count + 1);
    } catch (e) {
      // Ignore URL parsing errors
    }
  }
  
  /**
   * Record a cache hit/miss
   */
  public recordCacheAccess(hit: boolean, error: boolean = false): void {
    if (hit) {
      this.cacheMetrics.hits += 1;
    } else {
      this.cacheMetrics.misses += 1;
    }
    
    if (error) {
      this.cacheMetrics.errors += 1;
    }
  }
  
  /**
   * Record a rate limit event
   */
  public recordRateLimit(waitTimeMs: number): void {
    this.rateLimitMetrics.limited += 1;
    this.rateLimitMetrics.waitTime += waitTimeMs;
  }
  
  /**
   * Get cache hit rate as a percentage
   */
  public getCacheHitRate(): number {
    const total = this.cacheMetrics.hits + this.cacheMetrics.misses;
    return total > 0 ? (this.cacheMetrics.hits / total) * 100 : 0;
  }
  
  /**
   * Get average scrape time in milliseconds
   */
  public getAverageScrapeTime(scraperName?: string): number {
    if (scraperName) {
      const metrics = this.scraperMetrics.get(scraperName);
      return metrics && metrics.count > 0 
        ? metrics.totalTime / metrics.count 
        : 0;
    }
    
    // Overall average across all scrapers
    let totalTime = 0;
    let totalCount = 0;
    
    for (const metrics of this.scraperMetrics.values()) {
      totalTime += metrics.totalTime;
      totalCount += metrics.count;
    }
    
    return totalCount > 0 ? totalTime / totalCount : 0;
  }
  
  /**
   * Get rate limiting statistics
   */
  public getRateLimitStats(): {
    limitCount: number;
    averageWaitTime: number;
  } {
    return {
      limitCount: this.rateLimitMetrics.limited,
      averageWaitTime: this.rateLimitMetrics.limited > 0
        ? this.rateLimitMetrics.waitTime / this.rateLimitMetrics.limited
        : 0
    };
  }
  
  /**
   * Get top requested domains
   */
  public getTopDomains(limit: number = 5): Array<{domain: string; count: number}> {
    return Array.from(this.domainRequests.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([domain, count]) => ({ domain, count }));
  }
  
  /**
   * Get full metrics report
   */
  public getReport(): any {
    return {
      scrapers: Object.fromEntries(this.scraperMetrics),
      cache: {
        ...this.cacheMetrics,
        hitRate: this.getCacheHitRate()
      },
      rateLimit: this.getRateLimitStats(),
      topDomains: this.getTopDomains(),
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Reset all monitoring data
   */
  public reset(): void {
    this.scraperMetrics.clear();
    this.cacheMetrics = { hits: 0, misses: 0, errors: 0 };
    this.rateLimitMetrics = { limited: 0, waitTime: 0 };
    this.domainRequests.clear();
  }
}

// Export a global instance
export const monitor = ScraperMonitor.getInstance();

/**
 * Higher-order function to wrap a function with performance monitoring
 */
export function withMonitoring<T extends (...args: any[]) => Promise<any>>(
  fn: T, 
  scraperName: string
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const url = args[0] as string;
    const startTime = Date.now();
    let success = true;
    
    try {
      const result = await fn(...args);
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      monitor.recordScrape(scraperName, duration, success, url);
    }
  }) as T;
}
