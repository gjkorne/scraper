import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

interface ScraperStats {
  total_scrapes: number;
  cache_hit_rate: number;
  avg_scrape_time: number;
  error_rate: number;
  top_domains: { domain: string; count: number }[];
  rate_limits: { count: number; avg_wait_time: number };
  performance_by_scraper: Record<string, {
    count: number;
    avg_time: number;
    min_time: number;
    max_time: number;
    error_rate: number;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get 30-day statistics from cache table
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Get cache stats
    const { data: cacheData, error: cacheError } = await supabase
      .from("scraper_cache")
      .select("scraper_name, url, cache_hit_count, created_at, updated_at")
      .gte("created_at", thirtyDaysAgo.toISOString());
      
    if (cacheError) {
      throw new Error(`Error fetching cache stats: ${cacheError.message}`);
    }
    
    // Get basic stats from scraping logs (we'll implement this table next)
    const { data: logsData, error: logsError } = await supabase
      .from("scraper_logs")
      .select("*")
      .gte("created_at", thirtyDaysAgo.toISOString());
      
    if (logsError) {
      console.warn(`No scraper_logs table yet or error: ${logsError.message}`);
    }
    
    // Calculate statistics
    const stats: ScraperStats = {
      total_scrapes: cacheData.length,
      cache_hit_rate: calculateCacheHitRate(cacheData),
      avg_scrape_time: calculateAvgScrapeTime(logsData || []),
      error_rate: calculateErrorRate(logsData || []),
      top_domains: calculateTopDomains(cacheData),
      rate_limits: calculateRateLimits(logsData || []),
      performance_by_scraper: calculateScraperPerformance(cacheData, logsData || [])
    };
    
    // Return statistics with CORS headers
    return new Response(JSON.stringify(stats), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error generating scraper stats:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
});

// Helper functions to calculate statistics

function calculateCacheHitRate(cacheData: any[]): number {
  const totalHits = cacheData.reduce((sum, entry) => sum + entry.cache_hit_count, 0);
  return cacheData.length > 0 ? totalHits / cacheData.length : 0;
}

function calculateAvgScrapeTime(logsData: any[]): number {
  if (logsData.length === 0) return 0;
  
  const validLogs = logsData.filter(log => log.duration !== null);
  const totalTime = validLogs.reduce((sum, log) => sum + log.duration, 0);
  
  return validLogs.length > 0 ? totalTime / validLogs.length : 0;
}

function calculateErrorRate(logsData: any[]): number {
  if (logsData.length === 0) return 0;
  
  const errors = logsData.filter(log => log.error !== null && log.error !== "").length;
  return errors / logsData.length;
}

function calculateTopDomains(cacheData: any[]): { domain: string; count: number }[] {
  const domains = new Map<string, number>();
  
  cacheData.forEach(entry => {
    try {
      const domain = new URL(entry.url).hostname;
      domains.set(domain, (domains.get(domain) || 0) + 1);
    } catch (e) {
      // Skip invalid URLs
    }
  });
  
  return Array.from(domains.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([domain, count]) => ({ domain, count }));
}

function calculateRateLimits(logsData: any[]): { count: number; avg_wait_time: number } {
  const rateLimitLogs = logsData.filter(log => log.rate_limited === true);
  const totalWaitTime = rateLimitLogs.reduce((sum, log) => sum + (log.rate_limit_wait || 0), 0);
  
  return {
    count: rateLimitLogs.length,
    avg_wait_time: rateLimitLogs.length > 0 ? totalWaitTime / rateLimitLogs.length : 0
  };
}

function calculateScraperPerformance(cacheData: any[], logsData: any[]): Record<string, any> {
  const scraperStats = new Map<string, {
    count: number;
    total_time: number;
    min_time: number;
    max_time: number;
    errors: number;
  }>();
  
  // Group cache entries by scraper
  cacheData.forEach(entry => {
    const scraperName = entry.scraper_name;
    const stats = scraperStats.get(scraperName) || {
      count: 0,
      total_time: 0,
      min_time: Number.MAX_SAFE_INTEGER,
      max_time: 0,
      errors: 0
    };
    
    stats.count += 1;
    scraperStats.set(scraperName, stats);
  });
  
  // Add log data to scraper stats
  logsData.forEach(log => {
    const scraperName = log.scraper_name;
    const stats = scraperStats.get(scraperName) || {
      count: 0,
      total_time: 0,
      min_time: Number.MAX_SAFE_INTEGER,
      max_time: 0,
      errors: 0
    };
    
    if (log.duration) {
      stats.total_time += log.duration;
      stats.min_time = Math.min(stats.min_time, log.duration);
      stats.max_time = Math.max(stats.max_time, log.duration);
    }
    
    if (log.error) {
      stats.errors += 1;
    }
    
    scraperStats.set(scraperName, stats);
  });
  
  // Convert to final format
  const result: Record<string, any> = {};
  
  scraperStats.forEach((stats, scraperName) => {
    result[scraperName] = {
      count: stats.count,
      avg_time: stats.count > 0 ? stats.total_time / stats.count : 0,
      min_time: stats.min_time === Number.MAX_SAFE_INTEGER ? 0 : stats.min_time,
      max_time: stats.max_time,
      error_rate: stats.count > 0 ? stats.errors / stats.count : 0
    };
  });
  
  return result;
}
