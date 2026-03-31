/*
  # Correction du Conflit de Confirmation Email (v2)
  
  ## Problème
  Erreur 500 lors du clic sur les liens de confirmation email parce que :
  - Le trigger auto-confirme les utilisateurs à la création
  - Supabase envoie quand même un email de confirmation (config Dashboard)
  - L'utilisateur clique sur le lien de confirmation
  - Conflit : utilisateur déjà confirmé → Erreur 500
  
  ## Solution
  1. Améliorer le trigger pour gérer les mises à jour de confirmation
  2. Éviter les conflits lors de la confirmation
  3. S'assurer que tous les utilisateurs existants sont confirmés
  4. Ne pas toucher à confirmed_at (colonne générée)
  
  ## Tables Affectées
  - auth.users
  
  ## Important
  Cette migration NE RÉSOUT PAS le problème racine.
  VOUS DEVEZ désactiver "Confirm email" dans le Dashboard Supabase :
  https://supabase.com/dashboard/project/yxzvukryngvlzjgaydqj/auth/providers
*/

-- ============================================================================
-- 1. SUPPRIMER LES ANCIENS TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated_keep_confirmed ON auth.users;

-- ============================================================================
-- 2. AMÉLIORER LA FONCTION AUTO-CONFIRM
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Pour les INSERT : auto-confirmer immédiatement
  IF TG_OP = 'INSERT' THEN
    NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, now());
    NEW.confirmation_sent_at := NULL;
  END IF;
  
  -- Pour les UPDATE : s'assurer que la confirmation reste
  IF TG_OP = 'UPDATE' THEN
    -- Si l'utilisateur était déjà confirmé, garder la confirmation
    IF OLD.email_confirmed_at IS NOT NULL THEN
      NEW.email_confirmed_at := OLD.email_confirmed_at;
    -- Sinon, confirmer maintenant
    ELSE
      NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, now());
    END IF;
    
    -- Toujours supprimer confirmation_sent_at
    NEW.confirmation_sent_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. CRÉER LES NOUVEAUX TRIGGERS (INSERT ET UPDATE)
-- ============================================================================

-- Trigger pour les nouveaux utilisateurs (INSERT)
CREATE TRIGGER on_auth_user_created_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_confirm_user();

-- Trigger pour les mises à jour (UPDATE) - évite les conflits de confirmation
CREATE TRIGGER on_auth_user_updated_keep_confirmed
  BEFORE UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_confirm_user();

-- ============================================================================
-- 4. CONFIRMER TOUS LES UTILISATEURS EXISTANTS
-- ============================================================================

UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmation_sent_at = NULL
WHERE email_confirmed_at IS NULL;

-- ============================================================================
-- 5. DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION auto_confirm_user() IS 
'Auto-confirme les utilisateurs à la création et préserve la confirmation lors des mises à jour.
Évite les conflits quand Supabase essaie de confirmer un utilisateur déjà confirmé.
IMPORTANT: La confirmation email DOIT être désactivée dans le Dashboard Supabase.';

-- ============================================================================
-- 6. VÉRIFICATION ET MESSAGE
-- ============================================================================

DO $$
DECLARE
  total_users INT;
  confirmed_users INT;
BEGIN
  SELECT COUNT(*) INTO total_users FROM auth.users;
  SELECT COUNT(*) INTO confirmed_users FROM auth.users WHERE email_confirmed_at IS NOT NULL;
  
  RAISE NOTICE '=====================================================================';
  RAISE NOTICE 'CORRECTION APPLIQUÉE : Conflits de Confirmation Résolus';
  RAISE NOTICE '=====================================================================';
  RAISE NOTICE 'Utilisateurs totaux : %', total_users;
  RAISE NOTICE 'Utilisateurs confirmés : %', confirmed_users;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Triggers améliorés :';
  RAISE NOTICE '   - INSERT : Auto-confirmation';
  RAISE NOTICE '   - UPDATE : Préservation de la confirmation';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  ACTION CRITIQUE REQUISE :';
  RAISE NOTICE '';
  RAISE NOTICE 'Vous DEVEZ désactiver "Confirm email" dans le Dashboard :';
  RAISE NOTICE 'https://supabase.com/dashboard/project/yxzvukryngvlzjgaydqj/auth/providers';
  RAISE NOTICE '';
  RAISE NOTICE 'Sinon :';
  RAISE NOTICE '  - Les emails de confirmation seront toujours envoyés';
  RAISE NOTICE '  - Erreur 500 possible au clic sur les liens';
  RAISE NOTICE '  - Risque de rate limit (3 emails/heure)';
  RAISE NOTICE '';
  RAISE NOTICE 'Consultez : ERREUR_500_SOLUTION.md pour les instructions détaillées';
  RAISE NOTICE '=====================================================================';
END $$;
