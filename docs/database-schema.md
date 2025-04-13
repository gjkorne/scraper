# Database Schema Documentation

**Date:** April 12, 2025  
**Status:** Phase 0 - Planning & Foundation

This document provides comprehensive documentation of the database schema for the Job Scraper & Resume Customizer application, including current tables and planned schema changes.

## Current Database Schema

### `users` Table

Stores user profiles linked to Supabase authentication.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY, REFERENCES auth.users(id) | User ID from Supabase Auth |
| `email` | text | NOT NULL, UNIQUE | User's email address |
| `created_at` | timestamptz | DEFAULT now() | Timestamp when user was created |

**RLS Policies:**
- Users can read their own data
- Users can update their own data

### `jobs` Table

Stores job postings and application status.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique job identifier |
| `user_id` | uuid | NOT NULL, REFERENCES auth.users | User who owns this job posting |
| `url` | text | NOT NULL | Original job posting URL |
| `title` | text | NOT NULL | Job title |
| `company` | text | NOT NULL | Company name |
| `description` | text | NOT NULL | Full job description |
| `status` | text | NOT NULL, CHECK (status IN ('NEW', 'APPLIED', 'INTERVIEWING', 'ACCEPTED', 'REJECTED')) | Current application status |
| `date_added` | timestamptz | DEFAULT now() | When job was added |
| `date_modified` | timestamptz | DEFAULT now() | When job was last modified |
| `notes` | text | DEFAULT '' | User notes about the job |
| `application_date` | date |  | Date of job application |
| `interview_dates` | jsonb | DEFAULT '[]' | Scheduled interview dates |
| `follow_up_dates` | jsonb | DEFAULT '[]' | Follow-up dates for the application |
| `contact_info` | jsonb | DEFAULT '{}' | Contact information for the job |
| `salary_range` | jsonb | DEFAULT '{}' | Salary range for the job |
| `location` | text |  | Job location |
| `job_type` | text |  | Type of job (REMOTE, HYBRID, ONSITE) |

**RLS Policies:**
- Users can create their own jobs
- Users can view their own jobs
- Users can update their own jobs
- Users can delete their own jobs

## Planned Schema Changes

To support resume customization features, we need to expand the database schema with the following additions:

### 1. Job Analysis Table

This table will store the extracted keywords and analysis results from job descriptions.

```sql
CREATE TABLE IF NOT EXISTS job_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  keywords jsonb DEFAULT '[]', -- Array of extracted keywords with weights
  skills jsonb DEFAULT '[]', -- Array of identified skills
  requirements jsonb DEFAULT '[]', -- Array of identified requirements
  responsibilities jsonb DEFAULT '[]', -- Array of identified responsibilities 
  analysis_date timestamptz DEFAULT now(),
  raw_analysis_data jsonb DEFAULT '{}'
);

-- RLS Policies
ALTER TABLE job_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own job analysis"
  ON job_analysis
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_analysis.job_id AND jobs.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own job analysis"
  ON job_analysis
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_analysis.job_id AND jobs.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_analysis.job_id AND jobs.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own job analysis"
  ON job_analysis
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_analysis.job_id AND jobs.user_id = auth.uid()
  ));
```

### 2. Resume Templates Table

This table will store reusable resume templates for consistent formatting.

```sql
CREATE TABLE IF NOT EXISTS resume_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  template_data jsonb NOT NULL, -- Formatting, structure, style 
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_default boolean DEFAULT false,
  
  CONSTRAINT unique_user_template_name UNIQUE (user_id, name)
);

-- RLS Policies
ALTER TABLE resume_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own templates"
  ON resume_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own templates"
  ON resume_templates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON resume_templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON resume_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

### 3. Resumes Table

This table will store user resumes with versioning support.

```sql
CREATE TABLE IF NOT EXISTS resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  version int NOT NULL DEFAULT 1,
  content text NOT NULL, -- Original resume text content
  file_path text, -- Optional storage path to original file
  file_type text, -- File type (PDF, DOCX, etc.)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_base_version boolean DEFAULT false, -- Whether this is the master resume
  parent_id uuid REFERENCES resumes(id), -- For tracking versions
  template_id uuid REFERENCES resume_templates(id), -- Associated template
  
  CONSTRAINT unique_user_title_version UNIQUE (user_id, title, version)
);

-- RLS Policies
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own resumes"
  ON resumes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own resumes"
  ON resumes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own resumes"
  ON resumes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resumes"
  ON resumes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

### 4. Resume Sections Table

This table will store parsed sections of resumes for easier customization.

```sql
CREATE TABLE IF NOT EXISTS resume_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid REFERENCES resumes(id) ON DELETE CASCADE NOT NULL,
  section_type text NOT NULL, -- e.g., 'summary', 'experience', 'education', 'skills'
  title text,
  content text NOT NULL,
  order_index int NOT NULL, -- For ordering sections
  metadata jsonb DEFAULT '{}'
);

-- RLS Policies
ALTER TABLE resume_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own resume sections"
  ON resume_sections
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM resumes WHERE resumes.id = resume_sections.resume_id AND resumes.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own resume sections"
  ON resume_sections
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM resumes WHERE resumes.id = resume_sections.resume_id AND resumes.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM resumes WHERE resumes.id = resume_sections.resume_id AND resumes.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own resume sections"
  ON resume_sections
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM resumes WHERE resumes.id = resume_sections.resume_id AND resumes.user_id = auth.uid()
  ));
```

### 5. Customized Resumes Table

This table will track which resumes have been customized for specific jobs.

```sql
CREATE TABLE IF NOT EXISTS job_resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  resume_id uuid REFERENCES resumes(id) ON DELETE CASCADE NOT NULL,
  match_score numeric(5,2), -- Percentage match between resume and job
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  status text DEFAULT 'DRAFT', -- 'DRAFT', 'FINAL', 'SUBMITTED'
  notes text DEFAULT '',
  
  CONSTRAINT unique_job_resume UNIQUE (job_id, resume_id)
);

-- RLS Policies
ALTER TABLE job_resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own job-resume connections"
  ON job_resumes
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_resumes.job_id AND jobs.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own job-resume connections"
  ON job_resumes
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_resumes.job_id AND jobs.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_resumes.job_id AND jobs.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own job-resume connections"
  ON job_resumes
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_resumes.job_id AND jobs.user_id = auth.uid()
  ));
```

### 6. Application Outcomes Table

This table will track outcomes and analytics for job applications.

```sql
CREATE TABLE IF NOT EXISTS application_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  resume_id uuid REFERENCES resumes(id),
  outcome text NOT NULL, -- 'INTERVIEW', 'OFFER', 'REJECTION', 'NO_RESPONSE'
  outcome_date date,
  feedback text, -- Any feedback received
  customization_score numeric(5,2), -- How much the resume was customized (0-100%)
  metrics jsonb DEFAULT '{}' -- Additional metrics (time to response, etc.)
);

-- RLS Policies
ALTER TABLE application_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own application outcomes"
  ON application_outcomes
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = application_outcomes.job_id AND jobs.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own application outcomes"
  ON application_outcomes
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = application_outcomes.job_id AND jobs.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = application_outcomes.job_id AND jobs.user_id = auth.uid()
  ));
```

### 7. Skills Table (Reference)

This table will maintain a reference collection of standardized skills for better matching.

```sql
CREATE TABLE IF NOT EXISTS skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text, -- 'technical', 'soft', 'domain', etc.
  aliases jsonb DEFAULT '[]', -- Alternative names for this skill
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- No RLS needed for reference table
```

### 8. User Skills Table

This table will track which skills each user has and their proficiency levels.

```sql
CREATE TABLE IF NOT EXISTS user_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  skill_id uuid REFERENCES skills(id) ON DELETE CASCADE NOT NULL,
  proficiency_level int, -- 1-5 scale
  years_experience numeric(5,2),
  is_highlighted boolean DEFAULT false, -- Featured skills
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_user_skill UNIQUE (user_id, skill_id)
);

-- RLS Policies
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own skills"
  ON user_skills
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own skills"
  ON user_skills
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 9. User Profiles Table

Stores extended user profile information beyond the basic users table.

```sql
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users,
  full_name text,
  headline text, -- Professional headline
  location text,
  contact_info jsonb DEFAULT '{}',
  social_links jsonb DEFAULT '[]',
  experience_level text, -- 'ENTRY', 'MID', 'SENIOR', 'EXECUTIVE'
  preferred_industries jsonb DEFAULT '[]',
  preferred_job_types jsonb DEFAULT '[]',
  education jsonb DEFAULT '[]',
  certifications jsonb DEFAULT '[]',
  preferences jsonb DEFAULT '{}' -- App preferences and settings
);

-- RLS Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 10. Customization Feedback Table

Tracks user feedback on AI suggestions for resume customization.

```sql
CREATE TABLE IF NOT EXISTS customization_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  resume_id uuid REFERENCES resumes(id) ON DELETE CASCADE,
  section_id uuid REFERENCES resume_sections(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users NOT NULL,
  suggestion_text text NOT NULL,
  was_accepted boolean,
  user_feedback text,
  rating smallint, -- User rating of the suggestion (1-5)
  created_at timestamptz DEFAULT now()
);

-- RLS Policies
ALTER TABLE customization_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own feedback"
  ON customization_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

### 11. AI Settings Table

Controls user preferences for AI-assisted resume customization.

```sql
CREATE TABLE IF NOT EXISTS ai_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users,
  customization_level smallint DEFAULT 3, -- 1-5 scale (conservative to aggressive)
  preferred_tone text DEFAULT 'PROFESSIONAL', -- 'PROFESSIONAL', 'CONVERSATIONAL', 'TECHNICAL'
  highlight_preferences jsonb DEFAULT '{}', -- What to emphasize
  excluded_skills jsonb DEFAULT '[]', -- Skills to not mention
  max_length_preferences jsonb DEFAULT '{}', -- Length constraints
  enabled_features jsonb DEFAULT '{"keyword_matching": true, "gap_analysis": true}'
);

-- RLS Policies
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI settings"
  ON ai_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI settings"
  ON ai_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 12. Resume Job Matches Table

This table stores detailed matching analysis between resumes and job descriptions.

```sql
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
```

The `match_details` jsonb field stores detailed matching information including:

- `keywordScore`: Matching score for keywords in job description (0-100)
- `skillScore`: Matching score for technical and soft skills (0-100)
- `experienceScore`: Score for relevant experience (0-100)
- `educationScore`: Score for relevant education (0-100)
- `keywordMatches`: Array of keywords found in the resume
- `skillMatches`: Array of skills found in the resume
- `missingKeywords`: Keywords from job description not found in resume
- `missingSkills`: Skills from job description not found in resume
- `recommendations`: Suggestions for improving the resume match

## Entity Relationship Diagram

The following diagram illustrates the relationships between tables in the expanded schema:

```
users
  ↓ 1:1
  +--> user_profiles
  |
  ↓ 1:1
  +--> ai_settings
  |
  ↓ 1:N
  +--> jobs
  |     ↓ 1:1
  |     +--> job_analysis
  |     |
  |     ↓ 1:N
  |     +--> job_resumes
  |     |     ↑ N:1
  |     |     |
  |     ↓ 1:N |
  |     +--> application_outcomes
  |
  ↓ 1:N
  +--> resumes
  |     ↓ 1:N
  |     +--> resume_sections
  |     |
  |     ↓ N:1
  |     +--> resume_templates
  |
  ↓ 1:N
  +--> user_skills
  |     ↑ N:1
  |     |
  |     skills (reference)
  |
  ↓ 1:N
  +--> customization_feedback
```

## Migration Strategy

We will implement these schema changes incrementally:

1. **Phase 1**: 
   - Add `job_analysis` table for keyword extraction
   - Enhance `jobs` table with additional tracking fields

2. **Phase 2**: 
   - Add `resumes`, `resume_templates`, and `resume_sections` tables
   - Add `user_profiles` table

3. **Phase 3**: 
   - Add `skills` reference table and `user_skills` table
   - Add `ai_settings` table

4. **Phase 4**: 
   - Add `job_resumes` table for customized resumes
   - Add `application_outcomes` table
   - Add `customization_feedback` table

Each migration will be backward compatible, allowing the application to function with or without the new features.

## Indexing Strategy

The following indexes will be created to optimize query performance:

1. `jobs`: Index on `user_id` for fast retrieval of user's jobs
2. `resumes`: Compound index on `(user_id, title)` for resume search
3. `job_analysis`: Index on `job_id` for quick retrieval of analysis
4. `resume_sections`: Index on `resume_id` and `section_type` for filtered queries
5. `user_skills`: Index on `user_id` and `skill_id` for skill lookups
6. `application_outcomes`: Index on `job_id` and `outcome` for analytics
7. `resume_templates`: Index on `user_id` for template lookups

## Security Considerations

- All tables have Row Level Security (RLS) policies to ensure users can only access their own data
- Foreign key relationships enforce data integrity
- Check constraints ensure data validity (e.g., status values)
- No direct access to authentication tables
