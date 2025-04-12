# Caching System Documentation

**Last Updated:** April 12, 2025  
**Project:** Job Scraper & Resume Customizer

## Overview

The Job Scraper & Resume Customizer application now implements a robust caching system to improve performance, reduce load on job sites, and enhance user experience. The caching system stores previously scraped job data in the database, allowing for fast retrieval without needing to re-scrape sites for every request.

## Architecture

### Database Schema

The caching system is built around the `scraper_cache` table in the Supabase database:

```sql
CREATE TABLE scraper_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  content JSONB NOT NULL,
  scraper_name TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  headers JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  etag TEXT,
  last_modified TEXT,
  cache_hit_count INTEGER NOT NULL DEFAULT 0
);
```

Key fields:
- `url`: The URL of the scraped page, used as the primary cache key
- `content`: The cached response content as JSON
- `scraper_name`: Name of the scraper that generated this cache entry
- `expires_at`: When this cache entry should be considered stale
- `cache_hit_count`: Number of times this cache entry has been accessed

### Edge Function Integration

The caching system is integrated into the Edge Function architecture:

1. **Utility Layer**: `cache.ts` provides a `ScraperCache` class for interacting with the cache
2. **Base Scraper**: The `BaseScraper` class checks the cache before scraping
3. **Edge Function**: The main endpoint accepts a `bypass_cache` option to force fresh data

### Cache Control

Each scraper can define its own caching behavior:

```typescript
protected readonly cacheOptions = {
  ttl_hours: 24, // Default 24-hour cache
  bypass_cache: false
};
```

Different scrapers can have different TTL (time-to-live) values. For example:
- Standard scrapers: 24 hours
- Generic scraper: 12 hours (more conservative)

## User Interface

Users can control caching through the JobForm component with a "Bypass cache" checkbox to force fetching fresh data. This is useful when:

- The job posting might have been updated
- The initial scrape might have missed some details
- Testing scraper functionality

## Performance Benefits

The caching system provides several key benefits:

1. **Reduced Load Times**: Cached responses are retrieved in milliseconds compared to 1-5 seconds for fresh scrapes
2. **Lower API Usage**: Fewer requests to job sites means less chance of rate limiting or IP blocking
3. **Reduced Server Load**: Less processing required for cached responses
4. **Analytics Capabilities**: The `cache_hit_count` field can be used to analyze popular listings

## Implementation Details

### Database Functions

Several PostgreSQL functions manage the cache:

1. `upsert_scraper_cache`: Stores or updates a cache entry
2. `get_scraper_cache`: Retrieves a cache entry and updates hit count
3. `purge_expired_cache`: Removes stale cache entries

### Cache Validation

The cache includes HTTP validation fields:
- `etag`: HTTP ETag header for validation
- `last_modified`: HTTP Last-Modified header for validation

These can be used for conditional requests in future enhancements.

### Security Considerations

The cache implements proper Row Level Security (RLS) policies:
- Public read access (improves performance for all users)
- Authenticated write access (prevents cache poisoning)

## Usage Examples

### Frontend Usage

Users can toggle cache bypass in the UI:

```jsx
<label className="flex items-center text-sm text-gray-600">
  <input
    type="checkbox"
    checked={bypassCache}
    onChange={() => setBypassCache(!bypassCache)}
    className="rounded border-gray-300 text-blue-600 mr-2"
  />
  Bypass cache (fetch fresh data)
</label>
```

### Backend Usage

Developers can control caching in code:

```typescript
// Check cache first (default behavior)
const jobData = await scraper.scrape(url);

// Force bypass cache
const freshData = await scraper.scrape(url, { bypass_cache: true });
```

## Maintenance and Monitoring

### Cache Cleanup

Expired cache entries are automatically purged:

1. Current implementation requires manual execution of `purge_expired_cache()`
2. Future enhancement will add a cron job for automatic cleanup (using pg_cron)

### Monitoring Considerations

For production monitoring, consider tracking:
- Cache hit/miss ratio
- Cache entry size
- Expiration patterns
- Popular URLs

## Future Enhancements

Planned improvements for the caching system:

1. **Conditional Requests**: Implement If-None-Match/If-Modified-Since for more efficient updates
2. **Cache Warming**: Pre-cache popular job sites
3. **Cache Statistics**: Add admin dashboard with cache performance metrics
4. **Distributed Caching**: Investigate Redis or other external cache for higher performance
5. **Partial Content Updates**: Store scraped content in smaller, updatable chunks
