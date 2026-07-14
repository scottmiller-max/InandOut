/*
  # Security Fixes Part 4: Consolidate Overlapping RLS Policies (Batch 2)

  ## Changes Made
  
  ### Policy Consolidation
  Consolidates overlapping permissive policies for:
  - customers
  - document_acknowledgements
  - document_templates
  - documents_registry
  
  ## Security Impact
  - Clearer security boundaries
  - Improved query performance
  - Easier maintenance
*/

-- ============================================================================
-- CUSTOMERS: Consolidate 4 SELECT policies into 1
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage all customers" ON customers;


DROP POLICY IF EXISTS "Admins can view all customers" ON customers;


DROP POLICY IF EXISTS "Staff can read customers" ON customers;


DROP POLICY IF EXISTS "Users can view their own customer record" ON customers;



CREATE POLICY "Users can view customer records"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher', 'crew', 'master_admin')
    )
  );



-- ============================================================================
-- DOCUMENT_ACKNOWLEDGEMENTS: Consolidate INSERT policies
-- ============================================================================

DROP POLICY IF EXISTS "Service role full access to acknowledgements" ON document_acknowledgements;


DROP POLICY IF EXISTS "Users can insert own acknowledgements" ON document_acknowledgements;



CREATE POLICY "Users can insert acknowledgements"
  ON document_acknowledgements
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());



-- DOCUMENT_ACKNOWLEDGEMENTS: Consolidate SELECT policies
DROP POLICY IF EXISTS "Admin and dispatcher can read acknowledgements" ON document_acknowledgements;


DROP POLICY IF EXISTS "Master admin can read all acknowledgements" ON document_acknowledgements;


DROP POLICY IF EXISTS "Users can read own acknowledgements" ON document_acknowledgements;



CREATE POLICY "Users can read acknowledgements"
  ON document_acknowledgements
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher', 'master_admin')
    )
  );



-- ============================================================================
-- DOCUMENT_TEMPLATES: Consolidate SELECT policies
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage templates" ON document_templates;


DROP POLICY IF EXISTS "All authenticated users can view active templates" ON document_templates;



CREATE POLICY "Users can view active templates"
  ON document_templates
  FOR SELECT
  TO authenticated
  USING (
    is_active = true 
    OR 
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'master_admin')
    )
  );



-- ============================================================================
-- DOCUMENTS_REGISTRY: Consolidate all policies
-- ============================================================================

DROP POLICY IF EXISTS "Master admin full access to documents_registry" ON documents_registry;


DROP POLICY IF EXISTS "Service role full access to documents_registry" ON documents_registry;


DROP POLICY IF EXISTS "Admin and dispatcher can insert documents" ON documents_registry;


DROP POLICY IF EXISTS "Admin and dispatcher can read all documents" ON documents_registry;


DROP POLICY IF EXISTS "Admin and dispatcher can update documents" ON documents_registry;



CREATE POLICY "Admin staff manage documents"
  ON documents_registry
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher', 'master_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher', 'master_admin')
    )
  );
