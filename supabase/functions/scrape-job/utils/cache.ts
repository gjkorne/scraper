/**
 * Cache utilities for the job scrapers
 * Provides functionality to store and retrieve scraped content from the database cache
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Define cache entry interface
export interface CacheEntry {
  id: string;
  url: string;
  content: any;
  scraper_name: string;
  status_code: number;
  headers?: Record<string, string>;
  created_at: string;
  updated_at: string;
  expires_at: string;
  etag?: string;
  last_modified?: string;
  cache_hit_count: number;
  is_expired: boolean;
}

// Define cache options
export interface CacheOptions {
  ttl_hours?: number;
  bypass_cache?: boolean;
  update_hit_count?: boolean;
}

// Default cache options
const DEFAULT_CACHE_OPTIONS: CacheOptions = {
  ttl_hours: 24,
  bypass_cache: false,
  update_hit_count: true
};

/**
 * Supabase cache manager for the job scrapers
 */
export class ScraperCache {
  private client: ReturnType<typeof createClient>;
  private ready: boolean = false;

  constructor() {
    // Initialize the Supabase client
    this.client = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    this.ready = !!Deno.env.get('SUPABASE_URL') && !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  }

  /**
   * Check if the cache is initialized and ready
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Get a cached entry from the database
   */
  async get(url: string, options?: Partial<CacheOptions>): Promise<CacheEntry | null> {
    if (!this.ready) {
      console.warn('Cache not initialized, skipping cache lookup');
      return null;
    }

    const opts = { ...DEFAULT_CACHE_OPTIONS, ...options };
    
    // If bypass_cache is true, skip cache lookup
    if (opts.bypass_cache) {
      return null;
    }

    try {
      const { data, error } = await this.client.rpc(
        'get_scraper_cache',
        {
          p_url: url,
          p_update_hit_count: opts.update_hit_count
        }
      );

      if (error) {
        console.error('Error getting cache entry:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      // Return the first (and should be only) entry
      return data[0] as CacheEntry;
    } catch (error) {
      console.error('Exception getting cache entry:', error);
      return null;
    }
  }

  /**
   * Store content in the cache
   */
  async set(
    url: string,
    content: any,
    scraperName: string,
    options?: Partial<CacheOptions>,
    statusCode: number = 200,
    headers?: Record<string, string>
  ): Promise<string | null> {
    if (!this.ready) {
      console.warn('Cache not initialized, skipping cache storage');
      return null;
    }

    const opts = { ...DEFAULT_CACHE_OPTIONS, ...options };

    try {
      const { data, error } = await this.client.rpc(
        'upsert_scraper_cache',
        {
          p_url: url,
          p_content: content,
          p_scraper_name: scraperName,
          p_status_code: statusCode,
          p_headers: headers ? headers : {},
          p_ttl_hours: opts.ttl_hours,
          p_etag: headers?.['etag'] || null,
          p_last_modified: headers?.['last-modified'] || null
        }
      );

      if (error) {
        console.error('Error setting cache entry:', error);
        return null;
      }

      return data as string;
    } catch (error) {
      console.error('Exception setting cache entry:', error);
      return null;
    }
  }

  /**
   * Check if a URL exists in the cache and is not expired
   */
  async exists(url: string): Promise<boolean> {
    if (!this.ready) {
      return false;
    }

    try {
      const { data, error } = await this.client.rpc(
        'get_scraper_cache',
        {
          p_url: url,
          p_update_hit_count: false
        }
      );

      if (error) {
        console.error('Error checking cache entry existence:', error);
        return false;
      }

      return data && data.length > 0 && !data[0].is_expired;
    } catch (error) {
      console.error('Exception checking cache entry existence:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const scraperCache = new ScraperCache();
