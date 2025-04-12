-- Migration: Job Analysis Schema
-- Description: Creates the job_analysis table and related functions for Phase 1
-- Created at: 2025-04-12T17:10:00

-- Create the job_analysis table
CREATE TABLE IF NOT EXISTS job_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  keywords JSONB NOT NULL DEFAULT '[]',
  required_skills JSONB NOT NULL DEFAULT '[]',
  preferred_skills JSONB NOT NULL DEFAULT '[]',
  education_requirements JSONB NOT NULL DEFAULT '[]',
  experience_level TEXT,
  job_functions JSONB NOT NULL DEFAULT '[]',
  industry_sectors JSONB NOT NULL DEFAULT '[]',
  tools_technologies JSONB NOT NULL DEFAULT '[]',
  soft_skills JSONB NOT NULL DEFAULT '[]',
  salary_info JSONB,
  location_requirements TEXT,
  remote_options TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  analyzed_version TEXT NOT NULL DEFAULT '1.0',
  analysis_quality FLOAT,
  confidence_score FLOAT
);

-- Add table comments
COMMENT ON TABLE job_analysis IS 'Stores NLP analysis results from job descriptions';
COMMENT ON COLUMN job_analysis.keywords IS 'All extracted keywords from job description';
COMMENT ON COLUMN job_analysis.required_skills IS 'Skills explicitly marked as required';
COMMENT ON COLUMN job_analysis.preferred_skills IS 'Skills marked as preferred or desired';
COMMENT ON COLUMN job_analysis.education_requirements IS 'Detected education requirements';
COMMENT ON COLUMN job_analysis.experience_level IS 'Years or level of experience required';
COMMENT ON COLUMN job_analysis.job_functions IS 'Primary job functions identified';
COMMENT ON COLUMN job_analysis.industry_sectors IS 'Relevant industry sectors';
COMMENT ON COLUMN job_analysis.tools_technologies IS 'Specific tools or technologies mentioned';
COMMENT ON COLUMN job_analysis.soft_skills IS 'Soft skills and personality traits';
COMMENT ON COLUMN job_analysis.salary_info IS 'Extracted salary information if available';
COMMENT ON COLUMN job_analysis.location_requirements IS 'Geographic requirements';
COMMENT ON COLUMN job_analysis.remote_options IS 'Remote work options (fully, hybrid, on-site)';
COMMENT ON COLUMN job_analysis.analyzed_version IS 'Version of the analysis algorithm used';
COMMENT ON COLUMN job_analysis.analysis_quality IS 'Quality metric of analysis from 0-1';
COMMENT ON COLUMN job_analysis.confidence_score IS 'Confidence score of extraction from 0-1';

-- Index for faster job lookup
CREATE INDEX IF NOT EXISTS job_analysis_job_id_idx ON job_analysis(job_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_job_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_analysis_updated_at
BEFORE UPDATE ON job_analysis
FOR EACH ROW
EXECUTE FUNCTION update_job_analysis_updated_at();

-- Create a function to store job analysis
CREATE OR REPLACE FUNCTION store_job_analysis(
  p_job_id UUID,
  p_keywords JSONB,
  p_required_skills JSONB DEFAULT '[]'::JSONB,
  p_preferred_skills JSONB DEFAULT '[]'::JSONB,
  p_education_requirements JSONB DEFAULT '[]'::JSONB,
  p_experience_level TEXT DEFAULT NULL,
  p_job_functions JSONB DEFAULT '[]'::JSONB,
  p_industry_sectors JSONB DEFAULT '[]'::JSONB,
  p_tools_technologies JSONB DEFAULT '[]'::JSONB,
  p_soft_skills JSONB DEFAULT '[]'::JSONB,
  p_salary_info JSONB DEFAULT NULL,
  p_location_requirements TEXT DEFAULT NULL,
  p_remote_options TEXT DEFAULT NULL,
  p_analysis_quality FLOAT DEFAULT NULL,
  p_confidence_score FLOAT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Check if analysis already exists
  SELECT id INTO v_id FROM job_analysis WHERE job_id = p_job_id;
  
  IF v_id IS NULL THEN
    -- Insert new analysis
    INSERT INTO job_analysis (
      job_id,
      keywords,
      required_skills,
      preferred_skills,
      education_requirements,
      experience_level,
      job_functions,
      industry_sectors,
      tools_technologies,
      soft_skills,
      salary_info,
      location_requirements,
      remote_options,
      analysis_quality,
      confidence_score
    ) VALUES (
      p_job_id,
      p_keywords,
      p_required_skills,
      p_preferred_skills,
      p_education_requirements,
      p_experience_level,
      p_job_functions,
      p_industry_sectors,
      p_tools_technologies,
      p_soft_skills,
      p_salary_info,
      p_location_requirements,
      p_remote_options,
      p_analysis_quality,
      p_confidence_score
    )
    RETURNING id INTO v_id;
  ELSE
    -- Update existing analysis
    UPDATE job_analysis
    SET
      keywords = p_keywords,
      required_skills = p_required_skills,
      preferred_skills = p_preferred_skills,
      education_requirements = p_education_requirements,
      experience_level = p_experience_level,
      job_functions = p_job_functions,
      industry_sectors = p_industry_sectors,
      tools_technologies = p_tools_technologies,
      soft_skills = p_soft_skills,
      salary_info = p_salary_info,
      location_requirements = p_location_requirements,
      remote_options = p_remote_options,
      analysis_quality = p_analysis_quality,
      confidence_score = p_confidence_score,
      analyzed_version = '1.0',
      updated_at = now()
    WHERE id = v_id;
  END IF;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies
ALTER TABLE job_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_analysis_select_policy ON job_analysis
  FOR SELECT
  USING (
    job_id IN (SELECT id FROM jobs WHERE user_id = auth.uid())
  );

CREATE POLICY job_analysis_insert_policy ON job_analysis
  FOR INSERT
  WITH CHECK (
    job_id IN (SELECT id FROM jobs WHERE user_id = auth.uid())
  );

CREATE POLICY job_analysis_update_policy ON job_analysis
  FOR UPDATE
  USING (
    job_id IN (SELECT id FROM jobs WHERE user_id = auth.uid())
  );

CREATE POLICY job_analysis_delete_policy ON job_analysis
  FOR DELETE
  USING (
    job_id IN (SELECT id FROM jobs WHERE user_id = auth.uid())
  );

-- Create view for jobs with analysis
CREATE OR REPLACE VIEW jobs_with_analysis AS
SELECT 
  j.*,
  ja.keywords,
  ja.required_skills,
  ja.preferred_skills,
  ja.experience_level,
  ja.tools_technologies,
  ja.id AS analysis_id
FROM
  jobs j
LEFT JOIN
  job_analysis ja ON j.id = ja.job_id;
