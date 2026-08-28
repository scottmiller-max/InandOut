/*
  # Seed Sample Data

  1. Sample Data
    - Create sample user
    - Create sample move
    - Create sample events (replacing mock data)
    - Create sample messages
    - Create sample photos

  2. Purpose
    - Replace all mock data with real database entries
    - Provide realistic data for testing and development
*/

-- Insert sample user (this would normally be created through auth)
INSERT INTO users (
  id,
  email,
  first_name,
  last_name,
  phone,
  subscription_plan,
  total_moves,
  customer_rating,
  member_since
) VALUES (
  gen_random_uuid(),
  'sarah.johnson@email.com',
  'Sarah',
  'Johnson',
  '+1 (555) 123-4567',
  'premium',
  3,
  4.9,
  '2023-01-15T00:00:00Z'
) ON CONFLICT (email) DO NOTHING;

-- Get the user ID for foreign key references
DO $$
DECLARE
  sample_user_id uuid;
  sample_move_id uuid;
BEGIN
  -- Get sample user ID
  SELECT id INTO sample_user_id FROM users WHERE email = 'sarah.johnson@email.com';
  
  -- Insert sample move
  INSERT INTO moves (
    id,
    user_id,
    move_number,
    from_address,
    to_address,
    move_date,
    home_size,
    special_items,
    status,
    estimated_cost,
    team_id,
    driver_name,
    truck_number,
    progress_percentage
  ) VALUES (
    gen_random_uuid(),
    sample_user_id,
    '2024-001',
    '123 Oak Street, New York, NY 10001',
    '456 Pine Avenue, Brooklyn, NY 11201',
    '2024-03-25',
    '2-bedroom',
    '["piano", "artwork"]'::jsonb,
    'in_progress',
    899.00,
    'team-7',
    'Mike Rodriguez',
    'Truck #247',
    60
  ) ON CONFLICT (move_number) DO NOTHING
  RETURNING id INTO sample_move_id;
  
  -- If move already exists, get its ID
  IF sample_move_id IS NULL THEN
    SELECT id INTO sample_move_id FROM moves WHERE move_number = '2024-001';
  END IF;

  -- Insert sample events (replacing mock timeline data)
  INSERT INTO events (move_id, event_type, event_title, event_description, event_time, status) VALUES
    (sample_move_id, 'packing', 'Packing Complete', 'All items have been professionally packed and loaded onto the truck', '2024-03-25T08:00:00Z', 'completed'),
    (sample_move_id, 'loading', 'Loading & Transport', 'Items loaded, truck en route to destination', '2024-03-25T10:00:00Z', 'in_progress'),
    (sample_move_id, 'unloading', 'Unloading & Setup', 'Scheduled arrival and unloading at destination', '2024-03-25T14:00:00Z', 'scheduled')
  ON CONFLICT DO NOTHING;

  -- Insert sample messages
  INSERT INTO messages (move_id, sender_type, sender_name, sender_avatar, message_content, message_type, is_read) VALUES
    (sample_move_id, 'team', 'Mike Rodriguez', 'https://images.pexels.com/photos/5025665/pexels-photo-5025665.jpeg', 'We''re 15 minutes away from your location', 'text', false),
    (sample_move_id, 'system', 'IN&OUT Support', null, 'Your move is confirmed for March 25th', 'text', true),
    (sample_move_id, 'team', 'Mike Rodriguez', 'https://images.pexels.com/photos/5025665/pexels-photo-5025665.jpeg', 'All items loaded safely, heading to destination now', 'text', true)
  ON CONFLICT DO NOTHING;

  -- Insert sample customer photos
  INSERT INTO customer_photos (user_id, move_id, photo_url, photo_type, description, room_type, is_before_photo) VALUES
    (sample_user_id, sample_move_id, 'https://images.pexels.com/photos/7464230/pexels-photo-7464230.jpeg', 'room', 'Living room before packing', 'living_room', true),
    (sample_user_id, sample_move_id, 'https://images.pexels.com/photos/4246209/pexels-photo-4246209.jpeg', 'item', 'Piano requiring special handling', 'living_room', true),
    (sample_user_id, sample_move_id, 'https://images.pexels.com/photos/6195122/pexels-photo-6195122.jpeg', 'room', 'Bedroom packed and ready', 'bedroom', true)
  ON CONFLICT DO NOTHING;
END $$;