/*
  # Create Document Registry System with Edge Function Integration

  1. New Tables
    - `documents_registry` - Centralized document management with visibility control
      - `id` (uuid, primary key)
      - `document_type` (text, unique per active version) - Identifies document (terms_of_service, liability_waiver, etc.)
      - `title` (text) - Display name
      - `storage_bucket` (text) - Supabase storage bucket name
      - `storage_path` (text) - File path in storage
      - `version` (integer) - Version number for tracking
      - `active` (boolean) - Whether this is the current active version
      - `visibility` (text) - Access level: public, customer, staff, admin
      - `category` (text) - Document category: legal, operations, staff
      - `effective_date` (date) - When document becomes effective
      - `requires_acknowledgement` (boolean) - Whether users must acknowledge
      - `checksum` (text) - SHA-256 hash for integrity verification
      - `created_by` (uuid) - User who uploaded the document
      - `superseded_at` (timestamptz) - When this version was replaced
      - `created_at`, `updated_at` (timestamptz)

    - `document_acknowledgements` - Tracks user acknowledgements of documents
      - `id` (uuid, primary key)
      - `document_id` (uuid, references documents_registry)
      - `user_id` (uuid, references auth.users)
      - `version` (integer) - Version number acknowledged
      - `ip_address` (text) - Audit trail
      - `user_agent` (text) - Device tracking
      - `acknowledged_at` (timestamptz)
      - `metadata` (jsonb) - Riley context or additional data

  2. Schema Updates
    - Add `role` field to `staff_profiles` (denormalized from user_roles for Edge Function performance)
    - Rename `audit_log` fields for Edge Function compatibility:
      - `action_type` → `action`
      - `user_id` → `actor_id`
      - `action_details` → `metadata`
    - Add `mentioned_policies` to `ai_summaries` for Riley tracking
    - Add `policy_references` to `interactions` for Riley tracking

  3. Indexes
    - Unique partial index on documents_registry(document_type, active) WHERE active = true
    - Composite indexes for Edge Function query optimization
    - GIN indexes for policy reference searches

  4. Security
    - Enable RLS on all new tables
    - Visibility-based access control matching Edge Function logic
    - Service role bypass for Edge Functions
    - Audit trail for all document access

  5. Data Migration
    - Migrate existing document_templates to documents_registry
    - Map template_type → document_type, template_name → title
    - Set appropriate visibility based on document type
*/

-- =====================================================
-- STEP 1: Create documents_registry table
-- =====================================================

CREATE TABLE IF NOT EXISTS documents_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL,
  title text NOT NULL,
  storage_bucket text NOT NULL DEFAULT 'documents',
  storage_path text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  visibility text NOT NULL DEFAULT 'customer' CHECK (visibility IN ('public', 'customer', 'staff', 'admin')),
  category text NOT NULL DEFAULT 'legal' CHECK (category IN ('legal', 'operations', 'staff')),
  effective_date date,
  requires_acknowledgement boolean NOT NULL DEFAULT false,
  checksum text,
  created_by uuid REFERENCES auth.users(id),
  superseded_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE documents_registry IS 'Centralized document registry with visibility-based access control for Edge Function integration';
COMMENT ON COLUMN documents_registry.document_type IS 'Unique identifier for document (e.g., terms_of_service, liability_waiver)';
COMMENT ON COLUMN documents_registry.visibility IS 'Access level: public (all), customer (customers+staff), staff (crew+dispatcher+admin), admin (dispatcher+admin+master)';
COMMENT ON COLUMN documents_registry.active IS 'Only one version per document_type can be active at a time';

-- =====================================================
-- STEP 2: Create document_acknowledgements table
-- =====================================================

CREATE TABLE IF NOT EXISTS document_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents_registry(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  version integer NOT NULL,
  ip_address text,
  user_agent text,
  acknowledged_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE(document_id, user_id, version)
);

COMMENT ON TABLE document_acknowledgements IS 'Tracks user acknowledgements of documents for legal compliance';

-- =====================================================
-- STEP 3: Add role field to staff_profiles
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE staff_profiles ADD COLUMN role text CHECK (role IN ('crew', 'dispatcher', 'admin', 'master_admin'));
    COMMENT ON COLUMN staff_profiles.role IS 'Denormalized from user_roles for Edge Function query performance';
  END IF;
END $$;

-- Populate role from user_roles for existing staff profiles
UPDATE staff_profiles sp
SET role = ur.role
FROM user_roles ur
WHERE sp.user_id = ur.user_id
AND sp.role IS NULL;

-- =====================================================
-- STEP 4: Rename audit_log fields (Edge Function compatibility)
-- =====================================================

DO $$
BEGIN
  -- Rename action_type to action
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_log' AND column_name = 'action_type'
  ) THEN
    ALTER TABLE audit_log RENAME COLUMN action_type TO action;
  END IF;

  -- Rename user_id to actor_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_log' AND column_name = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_log' AND column_name = 'actor_id'
  ) THEN
    ALTER TABLE audit_log RENAME COLUMN user_id TO actor_id;
  END IF;

  -- Rename action_details to metadata (if not already named metadata)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_log' AND column_name = 'action_details'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_log' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE audit_log RENAME COLUMN action_details TO metadata;
  END IF;
END $$;

-- Update the foreign key constraint name if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'audit_log_user_id_fkey'
    AND table_name = 'audit_log'
  ) THEN
    ALTER TABLE audit_log DROP CONSTRAINT audit_log_user_id_fkey;
    ALTER TABLE audit_log ADD CONSTRAINT audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id);
  END IF;
END $$;

-- =====================================================
-- STEP 5: Add Riley policy tracking fields
-- =====================================================

DO $$
BEGIN
  -- Add mentioned_policies to ai_summaries
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_summaries' AND column_name = 'mentioned_policies'
  ) THEN
    ALTER TABLE ai_summaries ADD COLUMN mentioned_policies jsonb DEFAULT '[]'::jsonb;
    COMMENT ON COLUMN ai_summaries.mentioned_policies IS 'Array of policy references Riley mentioned: [{"document_type": "terms_of_service", "version": 2, "context": "explained refund policy"}]';
  END IF;

  -- Add policy_references to interactions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interactions' AND column_name = 'policy_references'
  ) THEN
    ALTER TABLE interactions ADD COLUMN policy_references jsonb DEFAULT '[]'::jsonb;
    COMMENT ON COLUMN interactions.policy_references IS 'Array of policy references mentioned in this interaction';
  END IF;
END $$;

-- =====================================================
-- STEP 6: Create indexes for performance
-- =====================================================

-- documents_registry indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_registry_active_type 
  ON documents_registry(document_type) 
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_documents_registry_visibility_active 
  ON documents_registry(visibility, active);

CREATE INDEX IF NOT EXISTS idx_documents_registry_document_type 
  ON documents_registry(document_type);

CREATE INDEX IF NOT EXISTS idx_documents_registry_type_version 
  ON documents_registry(document_type, version DESC);

CREATE INDEX IF NOT EXISTS idx_documents_registry_created_by 
  ON documents_registry(created_by);

CREATE INDEX IF NOT EXISTS idx_documents_registry_effective_date 
  ON documents_registry(effective_date);

-- document_acknowledgements indexes
CREATE INDEX IF NOT EXISTS idx_document_acks_document_id 
  ON document_acknowledgements(document_id);

CREATE INDEX IF NOT EXISTS idx_document_acks_user_id 
  ON document_acknowledgements(user_id);

CREATE INDEX IF NOT EXISTS idx_document_acks_acknowledged_at 
  ON document_acknowledgements(acknowledged_at DESC);

-- staff_profiles.role index for Edge Function queries
CREATE INDEX IF NOT EXISTS idx_staff_profiles_role 
  ON staff_profiles(role) 
  WHERE role IS NOT NULL;

-- ai_summaries mentioned_policies index
CREATE INDEX IF NOT EXISTS idx_ai_summaries_mentioned_policies 
  ON ai_summaries USING GIN (mentioned_policies);

-- interactions policy_references index
CREATE INDEX IF NOT EXISTS idx_interactions_policy_references 
  ON interactions USING GIN (policy_references);

-- audit_log indexes (update to use new field names)
DROP INDEX IF EXISTS idx_audit_log_user_id;
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON audit_log(actor_id);

DROP INDEX IF EXISTS idx_audit_log_action_type;
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- =====================================================
-- STEP 7: Create triggers
-- =====================================================

-- Trigger to sync role from user_roles to staff_profiles
CREATE OR REPLACE FUNCTION sync_staff_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE staff_profiles
  SET role = NEW.role
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_staff_profile_role ON user_roles;
CREATE TRIGGER trigger_sync_staff_profile_role
  AFTER INSERT OR UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION sync_staff_profile_role();

-- Trigger to manage document version supersession
CREATE OR REPLACE FUNCTION manage_document_version()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a document to active, mark previous active version as superseded
  IF NEW.active = true THEN
    UPDATE documents_registry
    SET 
      active = false,
      superseded_at = now()
    WHERE 
      document_type = NEW.document_type
      AND active = true
      AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_manage_document_version ON documents_registry;
CREATE TRIGGER trigger_manage_document_version
  BEFORE INSERT OR UPDATE ON documents_registry
  FOR EACH ROW
  EXECUTE FUNCTION manage_document_version();

-- Trigger for updated_at on documents_registry
CREATE OR REPLACE FUNCTION update_documents_registry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_documents_registry_updated_at ON documents_registry;
CREATE TRIGGER trigger_update_documents_registry_updated_at
  BEFORE UPDATE ON documents_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_documents_registry_updated_at();

-- =====================================================
-- STEP 8: Enable RLS
-- =====================================================

ALTER TABLE documents_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_acknowledgements ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 9: Create RLS policies for documents_registry
-- =====================================================

-- Service role full access (for Edge Functions)
CREATE POLICY "Service role full access to documents_registry"
  ON documents_registry
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Master admin full access
CREATE POLICY "Master admin full access to documents_registry"
  ON documents_registry
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'master_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'master_admin'
    )
  );

-- Admin and dispatcher can read all documents
CREATE POLICY "Admin and dispatcher can read all documents"
  ON documents_registry
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'dispatcher')
    )
  );

-- Admin and dispatcher can update active documents
CREATE POLICY "Admin and dispatcher can update documents"
  ON documents_registry
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'dispatcher')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'dispatcher')
    )
  );

-- Admin and dispatcher can insert new documents
CREATE POLICY "Admin and dispatcher can insert documents"
  ON documents_registry
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'dispatcher')
    )
    AND created_by = auth.uid()
  );

-- =====================================================
-- STEP 10: Create RLS policies for document_acknowledgements
-- =====================================================

-- Service role full access (for Edge Functions)
CREATE POLICY "Service role full access to acknowledgements"
  ON document_acknowledgements
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Master admin can read all acknowledgements
CREATE POLICY "Master admin can read all acknowledgements"
  ON document_acknowledgements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'master_admin'
    )
  );

-- Admin and dispatcher can read all acknowledgements
CREATE POLICY "Admin and dispatcher can read acknowledgements"
  ON document_acknowledgements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'dispatcher')
    )
  );

-- Users can read their own acknowledgements
CREATE POLICY "Users can read own acknowledgements"
  ON document_acknowledgements
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own acknowledgements
CREATE POLICY "Users can insert own acknowledgements"
  ON document_acknowledgements
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- STEP 11: Migrate data from document_templates
-- =====================================================

-- Map document types
INSERT INTO documents_registry (
  document_type,
  title,
  storage_bucket,
  storage_path,
  version,
  active,
  visibility,
  category,
  requires_acknowledgement,
  created_by,
  created_at,
  updated_at
)
SELECT 
  CASE template_type
    WHEN 'liability_waiver' THEN 'liability_waiver'
    WHEN 'refusal_policy' THEN 'refusal_policy'
    WHEN 'service_agreement' THEN 'service_agreement'
    WHEN 'completion_acknowledgment' THEN 'completion_acknowledgment'
    WHEN 'no_equipment_agreement' THEN 'no_equipment_agreement'
    WHEN 'invoice_template' THEN 'invoice_template'
    WHEN 'quote_template' THEN 'quote_template'
    ELSE template_type
  END as document_type,
  template_name as title,
  'documents' as storage_bucket,
  file_path as storage_path,
  COALESCE(version, 1) as version,
  COALESCE(is_active, true) as active,
  CASE template_type
    WHEN 'liability_waiver' THEN 'customer'
    WHEN 'refusal_policy' THEN 'customer'
    WHEN 'service_agreement' THEN 'customer'
    WHEN 'completion_acknowledgment' THEN 'customer'
    WHEN 'no_equipment_agreement' THEN 'customer'
    WHEN 'invoice_template' THEN 'staff'
    WHEN 'quote_template' THEN 'staff'
    ELSE 'customer'
  END as visibility,
  CASE template_type
    WHEN 'invoice_template' THEN 'operations'
    WHEN 'quote_template' THEN 'operations'
    ELSE 'legal'
  END as category,
  CASE template_type
    WHEN 'liability_waiver' THEN true
    WHEN 'service_agreement' THEN true
    WHEN 'completion_acknowledgment' THEN true
    ELSE false
  END as requires_acknowledgement,
  NULL as created_by,
  created_at,
  updated_at
FROM document_templates
WHERE NOT EXISTS (
  SELECT 1 FROM documents_registry dr
  WHERE dr.document_type = CASE document_templates.template_type
    WHEN 'liability_waiver' THEN 'liability_waiver'
    WHEN 'refusal_policy' THEN 'refusal_policy'
    WHEN 'service_agreement' THEN 'service_agreement'
    WHEN 'completion_acknowledgment' THEN 'completion_acknowledgment'
    WHEN 'no_equipment_agreement' THEN 'no_equipment_agreement'
    WHEN 'invoice_template' THEN 'invoice_template'
    WHEN 'quote_template' THEN 'quote_template'
    ELSE document_templates.template_type
  END
);

-- =====================================================
-- STEP 12: Update existing RLS policies referencing old audit_log field names
-- =====================================================

-- Drop and recreate audit_log policies with new field names
DROP POLICY IF EXISTS "Master admin can read audit logs" ON audit_log;
CREATE POLICY "Master admin can read audit logs"
  ON audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'master_admin'
    )
  );

DROP POLICY IF EXISTS "Service role can insert audit logs" ON audit_log;
CREATE POLICY "Service role can insert audit logs"
  ON audit_log
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');