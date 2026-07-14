-- Enable RLS on the 3 tables flagged by the security advisor.
-- All three are backend-only infrastructure tables: every write path found in the
-- codebase goes through either a service-role edge function client or a
-- SECURITY DEFINER RPC (increment_daily_counter), both of which bypass RLS.
-- No client-side (anon/authenticated) code path reads or writes these tables directly.
-- Policies mirror the existing master_admin/service_role pattern used on audit_log.

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits_config ENABLE ROW LEVEL SECURITY;

-- admin_users: simple admin allowlist. Only master_admin may view it; only the
-- service role may modify it (granting admin status is never a client operation).
CREATE POLICY "Master admin can read admin_users"
  ON public.admin_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'master_admin'
    )
  );

CREATE POLICY "Service role can manage admin_users"
  ON public.admin_users
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- daily_counters: written exclusively via the SECURITY DEFINER function
-- increment_daily_counter, which bypasses RLS regardless of policies here.
-- No anon/authenticated policy is added (full lockout for those roles).
-- master_admin gets read access for observability/debugging.
CREATE POLICY "Master admin can read daily_counters"
  ON public.daily_counters
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'master_admin'
    )
  );

CREATE POLICY "Service role can manage daily_counters"
  ON public.daily_counters
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- rate_limits_config: numeric thresholds only, no PII. No client code path reads
-- it directly today; scoped to master_admin read + service_role write to match
-- least-privilege pattern used elsewhere.
CREATE POLICY "Master admin can read rate_limits_config"
  ON public.rate_limits_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'master_admin'
    )
  );

CREATE POLICY "Service role can manage rate_limits_config"
  ON public.rate_limits_config
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
