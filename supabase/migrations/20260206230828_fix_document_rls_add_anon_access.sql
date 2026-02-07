/*
  # Fix Document Table RLS - Add Backend Server Access

  1. Changes
    - Add anon role policies for all document tables
    - Backend server uses Supabase anon key and handles auth itself
    - All document operations go through the authenticated backend API

  2. Tables Updated
    - doc_templates, doc_mapping_profiles, generated_docs
    - client_staff_inputs, document_approvals, notifications
*/

DO $$ BEGIN
  CREATE POLICY "anon_read_templates" ON doc_templates FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_insert_templates" ON doc_templates FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_update_templates" ON doc_templates FOR UPDATE TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_delete_templates" ON doc_templates FOR DELETE TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_read_mappings" ON doc_mapping_profiles FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_insert_mappings" ON doc_mapping_profiles FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_update_mappings" ON doc_mapping_profiles FOR UPDATE TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_delete_mappings" ON doc_mapping_profiles FOR DELETE TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_read_generated" ON generated_docs FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_insert_generated" ON generated_docs FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_update_generated" ON generated_docs FOR UPDATE TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_delete_generated" ON generated_docs FOR DELETE TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_read_staff_inputs" ON client_staff_inputs FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_insert_staff_inputs" ON client_staff_inputs FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_update_staff_inputs" ON client_staff_inputs FOR UPDATE TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_read_approvals" ON document_approvals FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_insert_approvals" ON document_approvals FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_update_approvals" ON document_approvals FOR UPDATE TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_read_notifications" ON notifications FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_insert_notifications" ON notifications FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "anon_update_notifications" ON notifications FOR UPDATE TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
