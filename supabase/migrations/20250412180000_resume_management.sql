-- Resume management system migration
-- This establishes the database schema for resume storage, versioning, and analysis

-- Resume storage table to track uploaded resume files
CREATE TABLE public.resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  original_filename TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false
);

-- Add RLS policies for resumes table
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

-- Users can view their own resumes
CREATE POLICY "Users can view their own resumes" 
  ON public.resumes FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can create their own resumes
CREATE POLICY "Users can create their own resumes" 
  ON public.resumes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own resumes
CREATE POLICY "Users can update their own resumes" 
  ON public.resumes FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can delete their own resumes
CREATE POLICY "Users can delete their own resumes" 
  ON public.resumes FOR DELETE 
  USING (auth.uid() = user_id);

-- Resume versions table for tracking different versions of a resume
CREATE TABLE public.resume_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  version_name TEXT,
  content JSONB NOT NULL,  -- Structured resume data
  raw_text TEXT,           -- Full extracted text
  created_at TIMESTAMPTZ DEFAULT now(),
  created_for_job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  notes TEXT,
  is_current BOOLEAN DEFAULT false
);

-- Create index for faster lookups by resume_id
CREATE INDEX resume_versions_resume_id_idx ON public.resume_versions(resume_id);

-- Create index for version lookups
CREATE INDEX resume_versions_is_current_idx ON public.resume_versions(is_current);

-- Add constraint so only one version can be current for a resume
CREATE UNIQUE INDEX resume_versions_current_unique_idx ON public.resume_versions(resume_id) WHERE is_current = true;

-- Add RLS policies for resume_versions table
ALTER TABLE public.resume_versions ENABLE ROW LEVEL SECURITY;

-- Users can view versions of their own resumes
CREATE POLICY "Users can view versions of their own resumes" 
  ON public.resume_versions FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.resumes 
    WHERE public.resumes.id = resume_id AND public.resumes.user_id = auth.uid()
  ));

-- Users can create versions for their own resumes
CREATE POLICY "Users can create versions for their own resumes" 
  ON public.resume_versions FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.resumes 
    WHERE public.resumes.id = resume_id AND public.resumes.user_id = auth.uid()
  ));

-- Users can update versions of their own resumes
CREATE POLICY "Users can update versions of their own resumes" 
  ON public.resume_versions FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.resumes 
    WHERE public.resumes.id = resume_id AND public.resumes.user_id = auth.uid()
  ));

-- Users can delete versions of their own resumes
CREATE POLICY "Users can delete versions of their own resumes" 
  ON public.resume_versions FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.resumes 
    WHERE public.resumes.id = resume_id AND public.resumes.user_id = auth.uid()
  ));

-- Resume sections table for storing structured content by section
CREATE TABLE public.resume_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_version_id uuid NOT NULL REFERENCES public.resume_versions(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,  -- education, experience, skills, etc.
  content JSONB NOT NULL,
  order_index INTEGER NOT NULL,
  is_visible BOOLEAN DEFAULT true
);

-- Create index for faster lookups by resume_version_id
CREATE INDEX resume_sections_version_id_idx ON public.resume_sections(resume_version_id);

-- Create index for section type lookups
CREATE INDEX resume_sections_type_idx ON public.resume_sections(section_type);

-- Add RLS policies for resume_sections table
ALTER TABLE public.resume_sections ENABLE ROW LEVEL SECURITY;

-- Users can view sections of their own resume versions
CREATE POLICY "Users can view sections of their own resume versions" 
  ON public.resume_sections FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.resume_versions 
    JOIN public.resumes ON public.resume_versions.resume_id = public.resumes.id
    WHERE public.resume_sections.resume_version_id = public.resume_versions.id 
    AND public.resumes.user_id = auth.uid()
  ));

-- Users can create sections for their own resume versions
CREATE POLICY "Users can create sections for their own resume versions" 
  ON public.resume_sections FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.resume_versions 
    JOIN public.resumes ON public.resume_versions.resume_id = public.resumes.id
    WHERE public.resume_sections.resume_version_id = public.resume_versions.id 
    AND public.resumes.user_id = auth.uid()
  ));

-- Users can update sections of their own resume versions
CREATE POLICY "Users can update sections of their own resume versions" 
  ON public.resume_sections FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.resume_versions 
    JOIN public.resumes ON public.resume_versions.resume_id = public.resumes.id
    WHERE public.resume_sections.resume_version_id = public.resume_versions.id 
    AND public.resumes.user_id = auth.uid()
  ));

-- Users can delete sections of their own resume versions
CREATE POLICY "Users can delete sections of their own resume versions" 
  ON public.resume_sections FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.resume_versions 
    JOIN public.resumes ON public.resume_versions.resume_id = public.resumes.id
    WHERE public.resume_sections.resume_version_id = public.resume_versions.id 
    AND public.resumes.user_id = auth.uid()
  ));

-- Create resume templates table for storing reusable resume templates
CREATE TABLE public.resume_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  structure JSONB NOT NULL,  -- Defines the structure and order of sections
  styles TEXT NOT NULL,       -- CSS styles for the template
  created_by uuid REFERENCES auth.users(id),
  is_system BOOLEAN DEFAULT false,  -- System templates vs user templates
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add some default system templates
INSERT INTO public.resume_templates (name, description, structure, styles, is_system) 
VALUES 
(
  'Modern', 
  'A clean, modern layout with a sidebar for skills and contact information', 
  '{"sections": ["contact", "summary", "skills", "experience", "education", "certifications"], "layout": "sidebar-left"}',
  '/* CSS styles for Modern template */',
  true
), 
(
  'Traditional', 
  'A traditional chronological resume format', 
  '{"sections": ["contact", "objective", "experience", "education", "skills", "references"], "layout": "full-width"}',
  '/* CSS styles for Traditional template */',
  true
),
(
  'Creative', 
  'A creative design for roles in design, marketing, or creative fields', 
  '{"sections": ["contact", "profile", "skills", "portfolio", "experience", "education"], "layout": "grid"}',
  '/* CSS styles for Creative template */',
  true
);

-- Add RLS policies for resume_templates table
ALTER TABLE public.resume_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can view templates
CREATE POLICY "Everyone can view templates" 
  ON public.resume_templates FOR SELECT 
  USING (true);

-- Users can create their own templates
CREATE POLICY "Users can create their own templates" 
  ON public.resume_templates FOR INSERT 
  WITH CHECK (auth.uid() = created_by AND is_system = false);

-- Users can update their own templates
CREATE POLICY "Users can update their own templates" 
  ON public.resume_templates FOR UPDATE 
  USING (auth.uid() = created_by AND is_system = false);

-- Users can delete their own templates
CREATE POLICY "Users can delete their own templates" 
  ON public.resume_templates FOR DELETE 
  USING (auth.uid() = created_by AND is_system = false);

-- Create function to set only one version as current
CREATE OR REPLACE FUNCTION public.set_current_resume_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current THEN
    UPDATE public.resume_versions
    SET is_current = false
    WHERE resume_id = NEW.resume_id
      AND id != NEW.id
      AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to maintain current version consistency
CREATE TRIGGER set_current_resume_version_trigger
BEFORE INSERT OR UPDATE OF is_current ON public.resume_versions
FOR EACH ROW
WHEN (NEW.is_current = true)
EXECUTE FUNCTION public.set_current_resume_version();

-- Function to update timestamp when resume is updated
CREATE OR REPLACE FUNCTION public.update_resume_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating resume timestamp
CREATE TRIGGER update_resume_timestamp_trigger
BEFORE UPDATE ON public.resumes
FOR EACH ROW
EXECUTE FUNCTION public.update_resume_timestamp();

-- Create function to increment version number automatically
CREATE OR REPLACE FUNCTION public.set_resume_version_number()
RETURNS TRIGGER AS $$
DECLARE
  max_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) INTO max_version
  FROM public.resume_versions
  WHERE resume_id = NEW.resume_id;
  
  NEW.version_number = max_version + 1;
  
  -- Set as current version if it's the first version
  IF max_version = 0 THEN
    NEW.is_current = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-increment version number
CREATE TRIGGER set_resume_version_number_trigger
BEFORE INSERT ON public.resume_versions
FOR EACH ROW
WHEN (NEW.version_number IS NULL)
EXECUTE FUNCTION public.set_resume_version_number();

-- Add comments for documentation
COMMENT ON TABLE public.resumes IS 'Stores metadata about user-uploaded resume files';
COMMENT ON TABLE public.resume_versions IS 'Stores different versions of each resume for tracking changes';
COMMENT ON TABLE public.resume_sections IS 'Stores individual sections of resume versions';
COMMENT ON TABLE public.resume_templates IS 'Stores templates for generating formatted resumes';

-- Add tracking for resume-job matches
CREATE TABLE public.resume_job_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_version_id uuid NOT NULL REFERENCES public.resume_versions(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  match_score NUMERIC(5,2),  -- Percentage match (0-100)
  missing_skills JSONB,      -- Skills in job not in resume
  matching_skills JSONB,     -- Skills found in both
  recommendations JSONB,     -- Suggestions for improvement
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(resume_version_id, job_id)
);

-- Add RLS policies for resume_job_matches table
ALTER TABLE public.resume_job_matches ENABLE ROW LEVEL SECURITY;

-- Users can view matches for their own resumes
CREATE POLICY "Users can view matches for their own resumes" 
  ON public.resume_job_matches FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.resume_versions 
    JOIN public.resumes ON public.resume_versions.resume_id = public.resumes.id
    WHERE public.resume_job_matches.resume_version_id = public.resume_versions.id 
    AND public.resumes.user_id = auth.uid()
  ));

-- Users can create matches for their own resumes
CREATE POLICY "Users can create matches for their own resumes" 
  ON public.resume_job_matches FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.resume_versions 
    JOIN public.resumes ON public.resume_versions.resume_id = public.resumes.id
    WHERE public.resume_job_matches.resume_version_id = public.resume_versions.id 
    AND public.resumes.user_id = auth.uid()
  ));

-- Users can update matches for their own resumes
CREATE POLICY "Users can update matches for their own resumes" 
  ON public.resume_job_matches FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.resume_versions 
    JOIN public.resumes ON public.resume_versions.resume_id = public.resumes.id
    WHERE public.resume_job_matches.resume_version_id = public.resume_versions.id 
    AND public.resumes.user_id = auth.uid()
  ));
