/*
  # Create document management tables

  Migrates document generation storage from MongoDB to Supabase.

  1. New Tables
    - `doc_templates` - Document templates (DOCX, PDF)
      - `id` (text, primary key) - UUID string
      - `name` (text) - Template name
      - `type` (text) - DOCX or FILLABLE_PDF
      - `county` (text) - County name
      - `case_type` (text) - Type of case
      - `category` (text) - Document category
      - `file_path` (text) - Path to template file on disk
      - `file_content` (text) - Base64 encoded file content backup
      - `detected_variables` (jsonb) - Template variables
      - `detected_pdf_fields` (jsonb) - PDF form fields
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `doc_mapping_profiles` - Field mapping profiles
      - `id` (text, primary key)
      - `name` (text)
      - `template_id` (text) - FK to doc_templates
      - `mapping_json` (jsonb) - Field mappings
      - `repeat_rules_json` (jsonb)
      - `output_rules_json` (jsonb)
      - `dropbox_rules_json` (jsonb)
      - `created_at` / `updated_at` (timestamptz)

    - `generated_docs` - Generated document records
      - `id` (text, primary key)
      - `client_id` (text)
      - `template_id` (text)
      - `profile_id` (text)
      - `file_path` (text)
      - `dropbox_path` (text)
      - `output_format` (text)
      - `status` (text)
      - `metadata` (jsonb) - Additional document metadata
      - `created_at` (timestamptz)

    - `client_staff_inputs` - Saved staff inputs per client
      - `id` (uuid, primary key)
      - `client_id` (text, unique)
      - `inputs` (jsonb)
      - `created_at` / `updated_at` (timestamptz)

    - `document_approvals` - Document approval workflow records
      - `id` (text, primary key)
      - `doc_id` (text)
      - `status` (text) - pending, approved, rejected
      - `requested_by` (text)
      - `reviewed_by` (text)
      - `comments` (text)
      - `metadata` (jsonb)
      - `created_at` / `updated_at` (timestamptz)

    - `notifications` - User notifications
      - `id` (text, primary key)
      - `user_id` (text)
      - `type` (text)
      - `title` (text)
      - `message` (text)
      - `read` (boolean)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Authenticated users can perform CRUD operations
*/

CREATE TABLE IF NOT EXISTS doc_templates (
  id text PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'DOCX',
  county text DEFAULT 'Statewide',
  case_type text DEFAULT '',
  category text DEFAULT 'Other',
  file_path text DEFAULT '',
  file_content text DEFAULT '',
  detected_variables jsonb DEFAULT '[]'::jsonb,
  detected_pdf_fields jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE doc_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read doc_templates"
  ON doc_templates FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert doc_templates"
  ON doc_templates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update doc_templates"
  ON doc_templates FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete doc_templates"
  ON doc_templates FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);


CREATE TABLE IF NOT EXISTS doc_mapping_profiles (
  id text PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  template_id text NOT NULL DEFAULT '',
  mapping_json jsonb DEFAULT '{}'::jsonb,
  repeat_rules_json jsonb DEFAULT '{}'::jsonb,
  output_rules_json jsonb DEFAULT '{}'::jsonb,
  dropbox_rules_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE doc_mapping_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read doc_mapping_profiles"
  ON doc_mapping_profiles FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert doc_mapping_profiles"
  ON doc_mapping_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update doc_mapping_profiles"
  ON doc_mapping_profiles FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete doc_mapping_profiles"
  ON doc_mapping_profiles FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);


CREATE TABLE IF NOT EXISTS generated_docs (
  id text PRIMARY KEY,
  client_id text DEFAULT '',
  template_id text DEFAULT '',
  profile_id text DEFAULT '',
  file_path text DEFAULT '',
  dropbox_path text DEFAULT '',
  output_format text DEFAULT 'DOCX',
  status text DEFAULT 'generated',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE generated_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read generated_docs"
  ON generated_docs FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert generated_docs"
  ON generated_docs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update generated_docs"
  ON generated_docs FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete generated_docs"
  ON generated_docs FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);


CREATE TABLE IF NOT EXISTS client_staff_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text UNIQUE NOT NULL,
  inputs jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE client_staff_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read client_staff_inputs"
  ON client_staff_inputs FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert client_staff_inputs"
  ON client_staff_inputs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update client_staff_inputs"
  ON client_staff_inputs FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete client_staff_inputs"
  ON client_staff_inputs FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);


CREATE TABLE IF NOT EXISTS document_approvals (
  id text PRIMARY KEY,
  doc_id text DEFAULT '',
  status text DEFAULT 'pending',
  requested_by text DEFAULT '',
  reviewed_by text DEFAULT '',
  comments text DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE document_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read document_approvals"
  ON document_approvals FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert document_approvals"
  ON document_approvals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update document_approvals"
  ON document_approvals FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete document_approvals"
  ON document_approvals FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);


CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY,
  user_id text NOT NULL DEFAULT '',
  type text DEFAULT '',
  title text DEFAULT '',
  message text DEFAULT '',
  read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read notifications"
  ON notifications FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete notifications"
  ON notifications FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_doc_mapping_profiles_template_id ON doc_mapping_profiles(template_id);
CREATE INDEX IF NOT EXISTS idx_generated_docs_client_id ON generated_docs(client_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_doc_id ON document_approvals(doc_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
