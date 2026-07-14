/*
  # Add Admin RLS Write Policies for v0 Dashboard

  1. Modified Tables
    - `customers` - Added INSERT, UPDATE, DELETE policies for staff roles
    - `jobs` - Added INSERT, UPDATE, DELETE policies for staff roles
    - `moves` - Added INSERT, UPDATE policies for staff roles
    - `messages` - Added UPDATE policy for staff to mark messages as read
    - `stripe_customers` - Added SELECT policy for admin/master_admin
    - `stripe_orders` - Added SELECT policy for admin/master_admin
    - `stripe_subscriptions` - Added SELECT policy for admin/master_admin
    - `contact_submissions` - Added DELETE policy for master_admin only

  2. Security
    - All policies restricted to authenticated users with specific staff roles
    - DELETE operations on customers, jobs, contact_submissions limited to master_admin only
    - Stripe read access limited to admin and master_admin (not dispatcher)
    - All policies use subquery pattern matching existing codebase conventions
*/

-- customers: INSERT for staff
CREATE POLICY "Staff can create customers"
  ON public.customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = ANY(ARRAY['master_admin','admin','dispatcher'])
    )
  );



-- customers: UPDATE for staff
CREATE POLICY "Staff can update customers"
  ON public.customers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = ANY(ARRAY['master_admin','admin','dispatcher'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = ANY(ARRAY['master_admin','admin','dispatcher'])
    )
  );



-- customers: DELETE for master_admin only
CREATE POLICY "Master admin can delete customers"
  ON public.customers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'master_admin'
    )
  );



-- jobs: INSERT for staff
CREATE POLICY "Staff can create jobs"
  ON public.jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = ANY(ARRAY['master_admin','admin','dispatcher'])
    )
  );



-- jobs: UPDATE for staff
CREATE POLICY "Staff can update jobs"
  ON public.jobs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = ANY(ARRAY['master_admin','admin','dispatcher'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = ANY(ARRAY['master_admin','admin','dispatcher'])
    )
  );



-- jobs: DELETE for master_admin only
CREATE POLICY "Master admin can delete jobs"
  ON public.jobs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'master_admin'
    )
  );



-- moves: INSERT for staff
CREATE POLICY "Staff can create moves"
  ON public.moves
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = ANY(ARRAY['master_admin','admin','dispatcher'])
    )
  );



-- moves: UPDATE for staff
CREATE POLICY "Staff can update moves"
  ON public.moves
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = ANY(ARRAY['master_admin','admin','dispatcher'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = ANY(ARRAY['master_admin','admin','dispatcher'])
    )
  );



-- messages: UPDATE for staff (mark as read, etc.)
CREATE POLICY "Staff can update messages"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = ANY(ARRAY['master_admin','admin','dispatcher'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = ANY(ARRAY['master_admin','admin','dispatcher'])
    )
  );



-- stripe_customers: SELECT for admin staff
CREATE POLICY "Admin staff can view all stripe customers"
  ON public.stripe_customers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = ANY(ARRAY['master_admin','admin'])
    )
  );



-- stripe_orders: SELECT for admin staff
CREATE POLICY "Admin staff can view all stripe orders"
  ON public.stripe_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = ANY(ARRAY['master_admin','admin'])
    )
  );



-- stripe_subscriptions: SELECT for admin staff
CREATE POLICY "Admin staff can view all stripe subscriptions"
  ON public.stripe_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = ANY(ARRAY['master_admin','admin'])
    )
  );



-- contact_submissions: DELETE for master_admin
CREATE POLICY "Master admin can delete contact submissions"
  ON public.contact_submissions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'master_admin'
    )
  );
