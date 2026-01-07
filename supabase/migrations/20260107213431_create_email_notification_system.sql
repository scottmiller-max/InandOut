/*
  # Email Notification System

  ## Overview
  This migration creates a comprehensive email notification system with user preferences,
  delivery tracking, and throttling to prevent spam.

  ## New Tables

  ### 1. `job_notifications`
  Tracks all notification attempts across all channels (email, push, SMS)
  - `id` (uuid, primary key)
  - `job_id` (uuid, foreign key to moves table)
  - `user_id` (uuid, foreign key to auth.users)
  - `notification_type` (text) - e.g., 'booking_confirmation', 'status_update', 'team_assignment', 'payment_receipt'
  - `channel` (text) - 'email', 'push', or 'sms'
  - `status` (text) - 'pending', 'sent', 'failed'
  - `error_message` (text, nullable)
  - `sent_at` (timestamptz, nullable)
  - `metadata` (jsonb) - additional data like subject, template used, etc.
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `user_notification_preferences`
  Stores user opt-in/opt-out settings for different notification types
  - `user_id` (uuid, primary key, foreign key to auth.users)
  - `email_enabled` (boolean, default true)
  - `push_enabled` (boolean, default true)
  - `sms_enabled` (boolean, default false)
  - `booking_confirmations` (boolean, default true)
  - `status_updates` (boolean, default true)
  - `team_assignments` (boolean, default true)
  - `payment_receipts` (boolean, default true)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `email_throttle_log`
  Prevents spam by tracking email send frequency (max 1 per type per 15 minutes)
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `job_id` (uuid, foreign key to moves table)
  - `notification_type` (text)
  - `last_sent_at` (timestamptz)
  - `send_count` (integer, default 1)
  - `window_start` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all three tables
  - Users can read their own notifications and preferences
  - Only authenticated users can update their preferences
  - Admins can view all notifications for job management
  - Service role can insert notifications and update throttle logs

  ## Indexes
  - Index on job_notifications(job_id, user_id, notification_type)
  - Index on email_throttle_log(user_id, job_id, notification_type)
  - Index on job_notifications(created_at) for time-based queries
*/

-- Create job_notifications table
CREATE TABLE IF NOT EXISTS job_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES moves(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'push', 'sms')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message text,
  sent_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create user_notification_preferences table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled boolean DEFAULT true NOT NULL,
  push_enabled boolean DEFAULT true NOT NULL,
  sms_enabled boolean DEFAULT false NOT NULL,
  booking_confirmations boolean DEFAULT true NOT NULL,
  status_updates boolean DEFAULT true NOT NULL,
  team_assignments boolean DEFAULT true NOT NULL,
  payment_receipts boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create email_throttle_log table
CREATE TABLE IF NOT EXISTS email_throttle_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id uuid REFERENCES moves(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL,
  last_sent_at timestamptz DEFAULT now() NOT NULL,
  send_count integer DEFAULT 1 NOT NULL,
  window_start timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, job_id, notification_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_notifications_job_user_type 
  ON job_notifications(job_id, user_id, notification_type);

CREATE INDEX IF NOT EXISTS idx_job_notifications_created_at 
  ON job_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_throttle_log_lookup 
  ON email_throttle_log(user_id, job_id, notification_type);

CREATE INDEX IF NOT EXISTS idx_email_throttle_log_last_sent 
  ON email_throttle_log(last_sent_at);

-- Enable Row Level Security
ALTER TABLE job_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_throttle_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_notifications

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON job_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications"
  ON job_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('master_admin', 'admin', 'manager')
    )
  );

-- Service role can insert notifications (via edge functions)
CREATE POLICY "Service can insert notifications"
  ON job_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Service can update notification status
CREATE POLICY "Service can update notification status"
  ON job_notifications
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for user_notification_preferences

-- Users can view their own preferences
CREATE POLICY "Users can view own preferences"
  ON user_notification_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
  ON user_notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences"
  ON user_notification_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all preferences
CREATE POLICY "Admins can view all preferences"
  ON user_notification_preferences
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('master_admin', 'admin')
    )
  );

-- RLS Policies for email_throttle_log

-- Users can view their own throttle logs
CREATE POLICY "Users can view own throttle logs"
  ON email_throttle_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all throttle logs
CREATE POLICY "Admins can view all throttle logs"
  ON email_throttle_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('master_admin', 'admin')
    )
  );

-- Service can insert and update throttle logs
CREATE POLICY "Service can manage throttle logs"
  ON email_throttle_log
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to automatically create default preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default preferences on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_preferences ON auth.users;
CREATE TRIGGER on_auth_user_created_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_job_notifications_updated_at
  BEFORE UPDATE ON job_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_throttle_log_updated_at
  BEFORE UPDATE ON email_throttle_log
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
