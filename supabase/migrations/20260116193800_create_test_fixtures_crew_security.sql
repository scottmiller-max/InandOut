/*
  # Create Test Fixtures for Crew Security Testing

  1. Purpose
    - Create reusable test data for security verification
    - Enable testing of employment status checks
    - Validate crew data isolation policies
    - Provide test scenarios for access control

  2. Test Data Created
    - Test customers with and without assigned jobs
    - Helper function to manage test fixtures
    - Indexes for efficient test data cleanup

  3. Usage
    - Create test users via Supabase Auth dashboard first
    - Link staff profiles to test users manually
    - Use test customer data to verify RLS policies
    - Reset by calling cleanup_test_fixtures()

  IMPORTANT: These are test fixtures only. Do NOT use in production.
*/

-- Create test customers for security testing
INSERT INTO customers (full_name, email, phone, source, notes)
VALUES
  ('Test Customer Alpha', 'test-alpha@securitytest.example', '+15555550101', 'test', 'TEST_FIXTURE: Customer with assigned job'),
  ('Test Customer Beta', 'test-beta@securitytest.example', '+15555550102', 'test', 'TEST_FIXTURE: Customer with unassigned job'),
  ('Test Customer Gamma', 'test-gamma@securitytest.example', '+15555550103', 'test', 'TEST_FIXTURE: Customer with no jobs')
ON CONFLICT (email) DO NOTHING;



-- Create indexes for test data cleanup
CREATE INDEX IF NOT EXISTS idx_customers_test_fixtures ON customers(notes) WHERE notes LIKE '%TEST_FIXTURE%';


CREATE INDEX IF NOT EXISTS idx_staff_profiles_test_fixtures ON staff_profiles(notes) WHERE notes LIKE '%TEST_FIXTURE%';


CREATE INDEX IF NOT EXISTS idx_jobs_test_fixtures ON jobs(notes) WHERE notes LIKE '%TEST_FIXTURE%';



-- Create a helper function to clean up test fixtures
CREATE OR REPLACE FUNCTION cleanup_test_fixtures()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete test interactions
  DELETE FROM interactions WHERE notes LIKE '%TEST_FIXTURE%';


  
  -- Delete test call logs
  DELETE FROM call_logs WHERE customer_id IN (
    SELECT id FROM customers WHERE notes LIKE '%TEST_FIXTURE%'
  );


  
  -- Delete test AI summaries
  DELETE FROM ai_summaries WHERE customer_id IN (
    SELECT id FROM customers WHERE notes LIKE '%TEST_FIXTURE%'
  );


  
  -- Delete test jobs
  DELETE FROM jobs WHERE notes LIKE '%TEST_FIXTURE%';


  
  -- Delete test customers
  DELETE FROM customers WHERE notes LIKE '%TEST_FIXTURE%';


  
  RAISE NOTICE 'Test fixtures cleaned up successfully';


END;


$$;



COMMENT ON FUNCTION cleanup_test_fixtures IS 
'Cleanup function for security test fixtures. Run after testing: SELECT cleanup_test_fixtures();



Test Scenarios to Validate:
1. Employment Status Check:
   - Active crew member should access assigned jobs
   - Terminated crew member should be blocked from all endpoints
   - Inactive/on_leave crew should be blocked from all endpoints

2. Crew Data Isolation:
   - Crew should only see call_logs for assigned customers
   - Crew should only see ai_summaries for assigned customers  
   - Crew should only see interactions for assigned customers
   - Crew should only see jobs they are assigned to

3. Direct Query Testing:
   - Test RLS policies with direct Supabase queries
   - Verify crew cannot bypass edge function restrictions
   - Confirm admin/dispatcher access unrestricted

4. Audit Log Verification:
   - Failed access attempts should be logged
   - Employment status failures should be logged
   - All logs should include correct user_role and action_category

To create complete test fixtures:
1. Create test users in Supabase Auth dashboard
2. Link users to staff_profiles with varying employment_status
3. Create test jobs linked to test customers and crew
4. Test access with different user roles and employment statuses
';
