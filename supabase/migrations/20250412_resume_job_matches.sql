-- Create the resume_job_matches table
CREATE TABLE IF NOT EXISTS resume_job_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid REFERENCES resumes(id) ON DELETE CASCADE NOT NULL,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  match_score integer NOT NULL, -- Overall match score (0-100)
  match_details jsonb DEFAULT '{}', -- Detailed match results
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_resume_job_match UNIQUE (resume_id, job_id)
);

-- RLS Policies
ALTER TABLE resume_job_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own resume-job matches"
  ON resume_job_matches
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM resumes 
    WHERE resumes.id = resume_job_matches.resume_id 
    AND resumes.user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own resume-job matches"
  ON resume_job_matches
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM resumes 
    WHERE resumes.id = resume_job_matches.resume_id 
    AND resumes.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own resume-job matches"
  ON resume_job_matches
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM resumes 
    WHERE resumes.id = resume_job_matches.resume_id 
    AND resumes.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM resumes 
    WHERE resumes.id = resume_job_matches.resume_id 
    AND resumes.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own resume-job matches"
  ON resume_job_matches
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM resumes 
    WHERE resumes.id = resume_job_matches.resume_id 
    AND resumes.user_id = auth.uid()
  ));
