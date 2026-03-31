/*
  # Add RLS Policies for Profile Management

  1. Security Policies
    - Enable RLS on user_profiles and doctor_profiles tables
    - Add SELECT policies: Users can only read their own profiles
    - Add UPDATE policies: Users can only update their own profiles
  
  2. Notes
    - user_profiles: Uses auth.uid() = id (user_id is stored as id)
    - doctor_profiles: Uses auth.uid() = user_id (foreign key to auth.users)
    - All policies restricted to authenticated users only
    - Both USING and WITH CHECK clauses ensure complete security
*/

-- Enable RLS if not already enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read their own user_profile
CREATE POLICY "Users can read own user_profile"
ON public.user_profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can only update their own user_profile
CREATE POLICY "Users can update own user_profile"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Users can only read their own doctor_profile
CREATE POLICY "Users can read own doctor_profile"
ON public.doctor_profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can only update their own doctor_profile
CREATE POLICY "Users can update own doctor_profile"
ON public.doctor_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);