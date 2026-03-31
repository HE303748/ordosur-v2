/*
  # Create Avatars Storage Bucket and Policies

  1. Storage Bucket
    - Create 'avatars' bucket for storing doctor profile photos
    - Bucket is public for easy access to avatar images
  
  2. Security Policies
    - Users can upload their own avatar (INSERT)
    - Users can update their own avatar (UPDATE)
    - Anyone can view avatars (SELECT) - public access
  
  3. Notes
    - Avatar files stored at path: avatars/{user_id}/avatar.jpg
    - Public bucket allows direct URL access without authentication
    - Policies enforce that users can only modify their own avatars
*/

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own avatar
CREATE POLICY "Users can update own avatar"  
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Anyone can view avatars (public access)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');