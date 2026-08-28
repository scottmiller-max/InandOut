/*
  # Add notification preferences to users table

  1. Changes
    - Add `notification_preferences` column to `users` table
    - Store user notification settings as JSONB
    - Set default preferences for new users

  2. Security
    - No changes to existing RLS policies
    - Users can only update their own preferences
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'notification_preferences'
  ) THEN
    ALTER TABLE users ADD COLUMN notification_preferences JSONB DEFAULT '{
      "smsUpdates": true,
      "emailNotifications": true,
      "pushNotifications": false,
      "milestoneUpdates": true,
      "etaUpdates": true,
      "teamMessages": true
    }'::jsonb;
  END IF;
END $$;