-- Create scraper_logs table for performance monitoring
CREATE TABLE IF NOT EXISTS scraper_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scraper_name TEXT NOT NULL,
  url TEXT NOT NULL,
  duration INTEGER, -- in milliseconds
  status_code INTEGER,
  error TEXT,
  cache_hit BOOLEAN DEFAULT FALSE,
  rate_limited BOOLEAN DEFAULT FALSE,
  rate_limit_wait INTEGER, -- in milliseconds
  user_id uuid REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);

-- Create index on url for faster lookups
CREATE INDEX IF NOT EXISTS scraper_logs_url_idx ON scraper_logs(url);

-- Create index on scraper_name for monitoring queries
CREATE INDEX IF NOT EXISTS scraper_logs_name_idx ON scraper_logs(scraper_name);

-- Create index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS scraper_logs_created_at_idx ON scraper_logs(created_at);

-- Create an RLS policy to allow reads by anyone
CREATE POLICY select_scraper_logs ON scraper_logs
  FOR SELECT USING (true);

-- Create an RLS policy to allow writes by authenticated users
CREATE POLICY insert_scraper_logs ON scraper_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Enable RLS
ALTER TABLE scraper_logs ENABLE ROW LEVEL SECURITY;

-- Create a function to record a scraper log
CREATE OR REPLACE FUNCTION record_scraper_log(
  p_scraper_name TEXT,
  p_url TEXT,
  p_duration INTEGER DEFAULT NULL,
  p_status_code INTEGER DEFAULT NULL,
  p_error TEXT DEFAULT NULL,
  p_cache_hit BOOLEAN DEFAULT FALSE,
  p_rate_limited BOOLEAN DEFAULT FALSE,
  p_rate_limit_wait INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_log_id uuid;
BEGIN
  -- Get current user ID if authenticated
  v_user_id := auth.uid();
  
  -- Insert log entry
  INSERT INTO scraper_logs (
    scraper_name,
    url,
    duration,
    status_code,
    error,
    cache_hit,
    rate_limited,
    rate_limit_wait,
    user_id,
    metadata
  ) VALUES (
    p_scraper_name,
    p_url,
    p_duration,
    p_status_code,
    p_error,
    p_cache_hit,
    p_rate_limited,
    p_rate_limit_wait,
    v_user_id,
    p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Create a function to get aggregate scraper stats
CREATE OR REPLACE FUNCTION get_scraper_stats(
  p_days_ago INTEGER DEFAULT 30,
  p_scraper_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  scraper_name TEXT,
  total_count BIGINT,
  avg_duration NUMERIC,
  error_count BIGINT,
  error_rate NUMERIC,
  cache_hit_count BIGINT,
  cache_hit_rate NUMERIC,
  rate_limited_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    scraper_name,
    COUNT(*) AS total_count,
    AVG(duration) AS avg_duration,
    COUNT(*) FILTER (WHERE error IS NOT NULL) AS error_count,
    COUNT(*) FILTER (WHERE error IS NOT NULL)::NUMERIC / COUNT(*) AS error_rate,
    COUNT(*) FILTER (WHERE cache_hit) AS cache_hit_count,
    COUNT(*) FILTER (WHERE cache_hit)::NUMERIC / COUNT(*) AS cache_hit_rate,
    COUNT(*) FILTER (WHERE rate_limited) AS rate_limited_count
  FROM
    scraper_logs
  WHERE
    created_at >= (CURRENT_TIMESTAMP - (p_days_ago || ' days')::INTERVAL)
    AND (p_scraper_name IS NULL OR scraper_name = p_scraper_name)
  GROUP BY
    scraper_name
  ORDER BY
    total_count DESC;
$$;

-- Create a function to purge old logs
CREATE OR REPLACE FUNCTION purge_old_scraper_logs(
  p_days_to_keep INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM scraper_logs
  WHERE created_at < (CURRENT_TIMESTAMP - (p_days_to_keep || ' days')::INTERVAL)
  RETURNING COUNT(*) INTO v_deleted;
  
  RETURN v_deleted;
END;
$$;

-- Add a trigger to automatically purge old logs periodically
-- Note: This requires pg_cron extension
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- 
-- SELECT cron.schedule(
--   'purge-old-scraper-logs',
--   '0 0 * * 0',  -- Weekly at midnight on Sunday
--   $$SELECT purge_old_scraper_logs(90)$$
-- );

COMMENT ON TABLE scraper_logs IS 'Logs for scraper performance monitoring and debugging';
COMMENT ON COLUMN scraper_logs.scraper_name IS 'Name of the scraper that generated this log';
COMMENT ON COLUMN scraper_logs.url IS 'URL that was scraped';
COMMENT ON COLUMN scraper_logs.duration IS 'Time taken to scrape in milliseconds';
COMMENT ON COLUMN scraper_logs.status_code IS 'HTTP status code of the response';
COMMENT ON COLUMN scraper_logs.error IS 'Error message if scraping failed';
COMMENT ON COLUMN scraper_logs.cache_hit IS 'Whether this request was served from cache';
COMMENT ON COLUMN scraper_logs.rate_limited IS 'Whether rate limiting was applied';
COMMENT ON COLUMN scraper_logs.rate_limit_wait IS 'Time waited due to rate limiting in milliseconds';
COMMENT ON COLUMN scraper_logs.metadata IS 'Additional metadata about the scraping operation';
