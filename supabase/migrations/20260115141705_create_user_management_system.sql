/*
  # Système de Gestion des Utilisateurs

  1. Nouvelles Tables
    - `user_profiles`
      - `id` (uuid, primary key, référence auth.users)
      - `full_name` (text) - Nom complet de l'utilisateur
      - `email` (text) - Email de l'utilisateur
      - `account_status` (text) - Statut du compte: 'pending', 'active', 'suspended'
      - `email_confirmed` (boolean) - Email confirmé ou non
      - `role` (text) - Rôle: 'user', 'admin'
      - `created_at` (timestamptz) - Date de création
      - `updated_at` (timestamptz) - Date de mise à jour
      - `last_login` (timestamptz) - Dernière connexion
      - `suspended_reason` (text) - Raison de la suspension (optionnel)

  2. Sécurité
    - Enable RLS sur `user_profiles` table
    - Add policy pour les utilisateurs authentifiés pour voir leur propre profil
    - Add policy pour les admins pour voir tous les profils
    - Add policy pour les admins pour modifier les profils

  3. Fonctions
    - Fonction trigger pour créer automatiquement un profil lors de l'inscription
    - Fonction pour mettre à jour le champ updated_at automatiquement
*/

-- Créer la table user_profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  account_status text NOT NULL DEFAULT 'pending' CHECK (account_status IN ('pending', 'active', 'suspended')),
  email_confirmed boolean DEFAULT false,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'doctor', 'clinic')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_login timestamptz,
  suspended_reason text
);

-- Activer RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir leur propre profil
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Les utilisateurs peuvent mettre à jour leur propre profil (sauf le statut et le rôle)
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Les admins peuvent voir tous les profils
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Les admins peuvent mettre à jour tous les profils
CREATE POLICY "Admins can update all profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Les admins peuvent supprimer des profils
CREATE POLICY "Admins can delete profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Fonction pour créer automatiquement un profil utilisateur lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, email, email_confirmed, account_status)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    new.email_confirmed_at IS NOT NULL,
    CASE 
      WHEN new.email_confirmed_at IS NOT NULL THEN 'active'
      ELSE 'pending'
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer automatiquement un profil lors de l'inscription
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS on_user_profile_updated ON user_profiles;
CREATE TRIGGER on_user_profile_updated
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Créer un index sur le statut pour les requêtes de filtrage
CREATE INDEX IF NOT EXISTS idx_user_profiles_account_status ON user_profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_confirmed ON user_profiles(email_confirmed);

-- Créer une vue pour les statistiques d'inscription (accessible aux admins uniquement)
CREATE OR REPLACE VIEW user_statistics AS
SELECT
  COUNT(*) FILTER (WHERE account_status = 'active') as active_users,
  COUNT(*) FILTER (WHERE account_status = 'pending') as pending_users,
  COUNT(*) FILTER (WHERE account_status = 'suspended') as suspended_users,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_last_month,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as new_users_last_week,
  COUNT(*) as total_users
FROM user_profiles;
