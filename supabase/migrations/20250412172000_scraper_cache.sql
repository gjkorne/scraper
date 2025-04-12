-- Migration: Scraper Cache Schema
-- Description: Creates the scraper_cache table for storing scraped job content
-- Created at: 2025-04-12T17:20:00

-- Create the scraper_cache table
CREATE TABLE IF NOT EXISTS scraper_cache (
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

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS scraper_cache_url_idx ON scraper_cache(url);
CREATE INDEX IF NOT EXISTS scraper_cache_expires_at_idx ON scraper_cache(expires_at);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_scraper_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scraper_cache_updated_at
BEFORE UPDATE ON scraper_cache
FOR EACH ROW
EXECUTE FUNCTION update_scraper_cache_updated_at();

-- Create function to upsert cache entries
CREATE OR REPLACE FUNCTION upsert_scraper_cache(
  p_url TEXT,
  p_content JSONB,
  p_scraper_name TEXT,
  p_status_code INTEGER DEFAULT 200,
  p_headers JSONB DEFAULT '{}'::JSONB,
  p_ttl_hours INTEGER DEFAULT 24,
  p_etag TEXT DEFAULT NULL,
  p_last_modified TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Calculate expiration time
  v_expires_at := now() + (p_ttl_hours || ' hours')::INTERVAL;

  -- Try to update existing entry
  UPDATE scraper_cache
  SET 
    content = p_content,
    scraper_name = p_scraper_name,
    status_code = p_status_code,
    headers = p_headers,
    expires_at = v_expires_at,
    etag = p_etag,
    last_modified = p_last_modified,
    cache_hit_count = 0
  WHERE url = p_url
  RETURNING id INTO v_id;
  
  -- If no existing entry, insert new one
  IF v_id IS NULL THEN
    INSERT INTO scraper_cache (
      url,
      content,
      scraper_name,
      status_code,
      headers,
      expires_at,
      etag,
      last_modified
    ) VALUES (
      p_url,
      p_content,
      p_scraper_name,
      p_status_code,
      p_headers,
      v_expires_at,
      p_etag,
      p_last_modified
    )
    RETURNING id INTO v_id;
  END IF;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get cache entry
CREATE OR REPLACE FUNCTION get_scraper_cache(
  p_url TEXT,
  p_update_hit_count BOOLEAN DEFAULT TRUE
) RETURNS TABLE (
  id UUID,
  url TEXT,
  content JSONB,
  scraper_name TEXT,
  status_code INTEGER,
  headers JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  etag TEXT,
  last_modified TEXT,
  cache_hit_count INTEGER,
  is_expired BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.url,
    c.content,
    c.scraper_name,
    c.status_code,
    c.headers,
    c.created_at,
    c.updated_at,
    c.expires_at,
    c.etag,
    c.last_modified,
    c.cache_hit_count,
    c.expires_at < now() AS is_expired
  FROM scraper_cache c
  WHERE c.url = p_url;
  
  -- Update hit count if requested and entry exists
  IF p_update_hit_count AND EXISTS (SELECT 1 FROM scraper_cache WHERE url = p_url) THEN
    UPDATE scraper_cache
    SET cache_hit_count = cache_hit_count + 1
    WHERE url = p_url;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to purge expired cache entries
CREATE OR REPLACE FUNCTION purge_expired_cache() RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM scraper_cache
  WHERE expires_at < now()
  RETURNING COUNT(*) INTO v_count;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup job to run daily (this requires pg_cron extension enabled)
-- This is commented out by default since pg_cron might not be available in all environments
-- COMMENT OUT if you don't have pg_cron extension
-- 
-- DO $$
-- BEGIN
--   IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
--     SELECT cron.schedule('0 0 * * *', 'SELECT purge_expired_cache();');
--   END IF;
-- END
-- $$;

-- Set permissions (public can read cache, authenticated can write cache)
ALTER TABLE scraper_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY scraper_cache_select_policy ON scraper_cache
  FOR SELECT
  USING (true);

CREATE POLICY scraper_cache_insert_policy ON scraper_cache
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY scraper_cache_update_policy ON scraper_cache
  FOR UPDATE
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE scraper_cache IS 'Stores cached responses from job scrapers to reduce API calls and improve performance';
COMMENT ON COLUMN scraper_cache.url IS 'The URL of the scraped page, used as the primary cache key';
COMMENT ON COLUMN scraper_cache.content IS 'The cached response content as JSON';
COMMENT ON COLUMN scraper_cache.scraper_name IS 'Name of the scraper that generated this cache entry';
COMMENT ON COLUMN scraper_cache.status_code IS 'HTTP status code of the original response';
COMMENT ON COLUMN scraper_cache.headers IS 'Relevant HTTP headers from the original response';
COMMENT ON COLUMN scraper_cache.expires_at IS 'When this cache entry should be considered stale';
COMMENT ON COLUMN scraper_cache.etag IS 'HTTP ETag header value for cache validation';
COMMENT ON COLUMN scraper_cache.last_modified IS 'HTTP Last-Modified header value for cache validation';
COMMENT ON COLUMN scraper_cache.cache_hit_count IS 'Number of times this cache entry has been accessed';
