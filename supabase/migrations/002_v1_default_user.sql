-- Drop FK constraints on user_id for v1 (single-user, no auth)
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_user_id_fkey;
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_user_id_fkey;
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_user_id_fkey;

-- Allow profiles without auth.users entry
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Insert default user profile
INSERT INTO profiles (id, display_name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'George') 
ON CONFLICT (id) DO NOTHING;
