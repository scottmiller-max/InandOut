/*
  # Security Fixes Part 2: Enable RLS on rate_limits

  ## Changes Made
  
  ### RLS Enablement
  - Enables Row Level Security on public.rate_limits table
  - Only service role can manage rate limits (via Edge Functions)
  
  ## Security Impact
  - Prevents unauthorized access to rate limiting data
  - Ensures only system components can modify rate limits
*/

-- Enable RLS on rate_limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;



-- Only service role (Edge Functions) can manage rate limits
CREATE POLICY "Service role manages rate limits"
  ON rate_limits
  FOR ALL
  TO authenticated
  USING (false)  -- No direct user access
  WITH CHECK (false);

  -- No direct user writes;
