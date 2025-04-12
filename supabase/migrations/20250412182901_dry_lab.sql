/*
  # Create jobs table for tracking applications

  1. New Tables
    - `jobs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `url` (text)
      - `title` (text)
      - `company` (text)
      - `description` (text)
      - `status` (text)
      - `date_added` (timestamptz)
      - `date_modified` (timestamptz)
      - `notes` (text)

  2. Security
    - Enable RLS on `jobs` table
    - Add policies for CRUD operations
*/

CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  url text NOT NULL,
  title text NOT NULL,
  company text NOT NULL,
  description text NOT NULL,
  status text NOT NULL,
  date_added timestamptz DEFAULT now(),
  date_modified timestamptz DEFAULT now(),
  notes text DEFAULT '',

  CONSTRAINT status_values CHECK (status IN ('NEW', 'APPLIED', 'INTERVIEWING', 'ACCEPTED', 'REJECTED'))
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own jobs"
  ON jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own jobs"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs"
  ON jobs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs"
  ON jobs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);