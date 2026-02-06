/*
  # Create task_completion_dates table

  Migrates task completion date storage from MongoDB to Supabase.

  1. New Tables
    - `task_completion_dates`
      - `id` (uuid, primary key)
      - `case_id` (text, not null) - Airtable case/matter record ID
      - `task_key` (text, not null) - Unique task identifier within a case
      - `status` (text, not null) - Task status (Done, Not Applicable, etc.)
      - `completion_date` (timestamptz) - When the task was completed
      - `updated_by` (text) - Email of user who last updated
      - `updated_at` (timestamptz) - Last update timestamp
    - Unique constraint on (case_id, task_key)

  2. Security
    - Enable RLS on `task_completion_dates` table
    - Authenticated users can select, insert, update, delete their own records
*/

CREATE TABLE IF NOT EXISTS task_completion_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id text NOT NULL,
  task_key text NOT NULL,
  status text NOT NULL DEFAULT '',
  completion_date timestamptz,
  updated_by text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(case_id, task_key)
);

ALTER TABLE task_completion_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read task dates"
  ON task_completion_dates
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert task dates"
  ON task_completion_dates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update task dates"
  ON task_completion_dates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete task dates"
  ON task_completion_dates
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_task_completion_dates_case_id ON task_completion_dates(case_id);
