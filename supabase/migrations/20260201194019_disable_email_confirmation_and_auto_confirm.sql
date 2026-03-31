/*
  # Désactiver la Confirmation Email et Auto-Confirmer les Utilisateurs
  
  ## Problème Identifié
  La confirmation email est ACTIVÉE alors qu'elle devrait être désactivée.
  Cela cause des erreurs "email rate limit exceeded" lors de l'inscription.
  
  ## Solution
  1. Auto-confirmer tous les utilisateurs existants non confirmés
  2. Créer un trigger pour auto-confirmer les futurs utilisateurs
  
  ## Important
  Après cette migration, vous DEVEZ désactiver la confirmation email dans:
  Dashboard Supabase → Authentication → Providers → Email → 
  "Confirm email" = DÉSACTIVÉ
  
  ## Tables Affectées
  - auth.users (auto-confirmation des utilisateurs)
*/

-- ============================================================================
-- 1. AUTO-CONFIRMER TOUS LES UTILISATEURS EXISTANTS
-- ============================================================================

-- Confirmer tous les utilisateurs qui ne sont pas encore confirmés
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmation_sent_at = NULL
WHERE email_confirmed_at IS NULL;

-- ============================================================================
-- 2. CRÉER UN TRIGGER POUR AUTO-CONFIRMER LES NOUVEAUX UTILISATEURS
-- ============================================================================

-- Fonction pour auto-confirmer les nouveaux utilisateurs
CREATE OR REPLACE FUNCTION auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-confirmer l'email immédiatement
  NEW.email_confirmed_at := now();
  NEW.confirmation_sent_at := NULL;
  NEW.confirmed_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;

-- Créer le trigger pour auto-confirmer à la création
CREATE TRIGGER on_auth_user_created_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_confirm_user();

-- ============================================================================
-- 3. DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION auto_confirm_user() IS 'Auto-confirme les utilisateurs à la création pour éviter les emails de confirmation et les rate limits. IMPORTANT: La confirmation email doit être désactivée dans Dashboard Supabase.';

-- ============================================================================
-- 4. AFFICHER UN MESSAGE DE CONFIRMATION
-- ============================================================================

DO $$
DECLARE
  confirmed_count INT;
BEGIN
  SELECT COUNT(*) INTO confirmed_count
  FROM auth.users
  WHERE email_confirmed_at IS NOT NULL;
  
  RAISE NOTICE '=======================================================================';
  RAISE NOTICE 'AUTO-CONFIRMATION ACTIVÉE';
  RAISE NOTICE '=======================================================================';
  RAISE NOTICE 'Utilisateurs confirmés : %', confirmed_count;
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ ACTION REQUISE DANS SUPABASE DASHBOARD :';
  RAISE NOTICE '';
  RAISE NOTICE '1. Aller sur : https://supabase.com/dashboard/project/yxzvukryngvlzjgaydqj/auth/providers';
  RAISE NOTICE '2. Cliquer sur "Email" dans la liste des providers';
  RAISE NOTICE '3. DÉSACTIVER "Confirm email"';
  RAISE NOTICE '4. Sauvegarder';
  RAISE NOTICE '';
  RAISE NOTICE 'Cela évitera les erreurs "email rate limit exceeded"';
  RAISE NOTICE '=======================================================================';
END $$;
