/*
  # FOB Tracking System Tables

  1. New Tables
    - `fob_devices` - FOB hardware devices linked to trucks
    - `truck_locations` - Real-time location data from FOB devices  
    - `job_tracking` - Links jobs to FOB devices for customer tracking
    - `milestone_updates` - Automated milestone events for jobs

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users and service roles
    - Ensure customers can only see their own job data

  3. Indexes
    - Optimize for real-time location queries
    - Index milestone timestamps for efficient timeline queries
*/

-- FOB Devices Table
CREATE TABLE IF NOT EXISTS fob_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fob_id text UNIQUE NOT NULL,
  truck_id text NOT NULL,
  is_active boolean DEFAULT true,
  battery_level integer DEFAULT 100,
  last_ping timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Truck Locations Table (Real-time GPS data)
CREATE TABLE IF NOT EXISTS truck_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fob_id text NOT NULL,
  truck_id text,
  job_id uuid,
  latitude numeric(10, 8) NOT NULL,
  longitude numeric(11, 8) NOT NULL,
  speed numeric(5, 2) DEFAULT 0,
  heading numeric(5, 2) DEFAULT 0,
  timestamp timestamptz DEFAULT now(),
  status text DEFAULT 'idle',
  CONSTRAINT truck_locations_status_check CHECK (status = ANY (ARRAY['idle'::text, 'en_route'::text, 'at_pickup'::text, 'loading'::text, 'in_transit'::text, 'at_delivery'::text, 'unloading'::text, 'completed'::text]))
);

-- Job Tracking Table (Links jobs to FOB devices)
CREATE TABLE IF NOT EXISTS job_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  fob_id text NOT NULL,
  truck_id text NOT NULL,
  driver_name text NOT NULL,
  customer_phone text NOT NULL,
  estimated_arrival timestamptz,
  current_latitude numeric(10, 8),
  current_longitude numeric(11, 8),
  current_address text,
  status text DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT job_tracking_status_check CHECK (status = ANY (ARRAY['scheduled'::text, 'en_route'::text, 'arrived'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]))
);

-- Milestone Updates Table
CREATE TABLE IF NOT EXISTS milestone_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  milestone_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  location text,
  estimated_duration integer, -- in minutes
  created_at timestamptz DEFAULT now(),
  CONSTRAINT milestone_updates_type_check CHECK (milestone_type = ANY (ARRAY['arrival'::text, 'paperwork'::text, 'packing_start'::text, 'packing_finish'::text, 'loading_start'::text, 'loading_finish'::text, 'departure'::text, 'delivery_arrival'::text, 'unloading_start'::text, 'unloading_finish'::text, 'completion'::text]))
);

-- Enable Row Level Security
ALTER TABLE fob_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE truck_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_updates ENABLE ROW LEVEL SECURITY;

-- FOB Devices Policies (Service role only)
CREATE POLICY "Service role can manage FOB devices"
  ON fob_devices
  FOR ALL
  TO service_role
  USING (true);

-- Truck Locations Policies (Service role for inserts, customers can read their job data)
CREATE POLICY "Service role can insert truck locations"
  ON truck_locations
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Customers can read truck locations for their jobs"
  ON truck_locations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM job_tracking jt
      JOIN jobs j ON j.id = jt.job_id
      WHERE jt.fob_id = truck_locations.fob_id
      AND j.customer_id IN (
        SELECT id FROM customers WHERE email = auth.jwt() ->> 'email'
      )
    )
  );

-- Job Tracking Policies
CREATE POLICY "Service role can manage job tracking"
  ON job_tracking
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Customers can read their job tracking"
  ON job_tracking
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN customers c ON c.id = j.customer_id
      WHERE j.id = job_tracking.job_id
      AND c.email = auth.jwt() ->> 'email'
    )
  );

-- Milestone Updates Policies
CREATE POLICY "Service role can create milestone updates"
  ON milestone_updates
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Customers can read milestone updates for their jobs"
  ON milestone_updates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      JOIN customers c ON c.id = j.customer_id
      WHERE j.id = milestone_updates.job_id
      AND c.email = auth.jwt() ->> 'email'
    )
  );

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_fob_devices_fob_id ON fob_devices(fob_id);
CREATE INDEX IF NOT EXISTS idx_fob_devices_truck_id ON fob_devices(truck_id);
CREATE INDEX IF NOT EXISTS idx_fob_devices_active ON fob_devices(is_active);

CREATE INDEX IF NOT EXISTS idx_truck_locations_fob_id ON truck_locations(fob_id);
CREATE INDEX IF NOT EXISTS idx_truck_locations_timestamp ON truck_locations(timestamp);
CREATE INDEX IF NOT EXISTS idx_truck_locations_job_id ON truck_locations(job_id);
CREATE INDEX IF NOT EXISTS idx_truck_locations_status ON truck_locations(status);

CREATE INDEX IF NOT EXISTS idx_job_tracking_job_id ON job_tracking(job_id);
CREATE INDEX IF NOT EXISTS idx_job_tracking_fob_id ON job_tracking(fob_id);
CREATE INDEX IF NOT EXISTS idx_job_tracking_status ON job_tracking(status);

CREATE INDEX IF NOT EXISTS idx_milestone_updates_job_id ON milestone_updates(job_id);
CREATE INDEX IF NOT EXISTS idx_milestone_updates_timestamp ON milestone_updates(timestamp);
CREATE INDEX IF NOT EXISTS idx_milestone_updates_type ON milestone_updates(milestone_type);