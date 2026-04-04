-- ============================================================
-- MIGRATION 2026-04-04 — Correctifs critiques
-- 1. RLS user_profiles : récursion infinie → remplacé par SECURITY DEFINER
-- 2. RLS organizations INSERT : ouvert à tout utilisateur authentifié
-- 3. doctors : rpps et specialite rendus nullable
-- 4. Données manquantes pour contact.parfury@gmail.com
-- ============================================================


-- ============================================================
-- FIX 1 : user_profiles RLS — récursion infinie
-- Cause : les policies utilisaient EXISTS(SELECT … FROM user_profiles)
-- ce qui ré-évaluelait la policy en boucle.
-- Fix : utiliser get_my_role() / get_my_org_id() qui sont SECURITY
-- DEFINER et lisent user_profiles sans passer par RLS.
-- ============================================================

DROP POLICY IF EXISTS "profiles_select" ON user_profiles;
DROP POLICY IF EXISTS "profiles_insert" ON user_profiles;
DROP POLICY IF EXISTS "profiles_update" ON user_profiles;
DROP POLICY IF EXISTS "profiles_delete" ON user_profiles;

-- SELECT : chacun voit son propre profil ;
--          clinic_admin voit son org ; super_admin voit tout.
CREATE POLICY "profiles_select" ON user_profiles FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR get_my_role() = 'super_admin'
  OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id())
);

-- INSERT : un utilisateur peut insérer son propre profil (inscription),
--          super_admin peut insérer n'importe quel profil.
CREATE POLICY "profiles_insert" ON user_profiles FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR get_my_role() = 'super_admin'
);

-- UPDATE : même logique que SELECT
CREATE POLICY "profiles_update" ON user_profiles FOR UPDATE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR get_my_role() = 'super_admin'
  OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id())
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR get_my_role() = 'super_admin'
  OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id())
);

-- DELETE : super_admin uniquement
CREATE POLICY "profiles_delete" ON user_profiles FOR DELETE TO authenticated
USING (get_my_role() = 'super_admin');

DO $$ BEGIN RAISE NOTICE '✓ Fix 1 : RLS user_profiles récursion infinie corrigé'; END $$;


-- ============================================================
-- FIX 2 : organizations INSERT — trop restrictif
-- L'ancienne policy bloquait toute inscription (seul super_admin
-- pouvait créer une org, mais au moment de l'inscription il n'y
-- a pas encore de user_profile → get_my_role() = NULL → blocked).
-- Fix : tout utilisateur authentifié peut créer une organisation.
-- ============================================================

DROP POLICY IF EXISTS "orgs_insert" ON organizations;

CREATE POLICY "orgs_insert" ON organizations FOR INSERT TO authenticated
WITH CHECK (true);

DO $$ BEGIN RAISE NOTICE '✓ Fix 2 : organizations INSERT ouvert aux utilisateurs authentifiés'; END $$;


-- ============================================================
-- FIX 3 : doctors — colonnes rpps et specialite
-- Déclarées NOT NULL alors que l'app les traite comme optionnelles.
-- ============================================================

ALTER TABLE doctors ALTER COLUMN rpps       DROP NOT NULL;
ALTER TABLE doctors ALTER COLUMN specialite DROP NOT NULL;

DO $$ BEGIN RAISE NOTICE '✓ Fix 3 : doctors.rpps et doctors.specialite rendus nullable'; END $$;


-- ============================================================
-- FIX 4 : Données manquantes pour contact.parfury@gmail.com
-- user_id = c8325384-cef2-43f5-b1c6-bb56241ef8cb
-- Métadonnées auth : prenom=Oussama, nom=Ajmil,
--                   org_name=Test 12, org_type=cabinet, role=doctor
-- ============================================================

DO $$
DECLARE
  v_user_id  uuid := 'c8325384-cef2-43f5-b1c6-bb56241ef8cb';
  v_org_id   uuid;
BEGIN
  -- Vérifier si un profil existe déjà
  IF EXISTS (SELECT 1 FROM user_profiles WHERE user_id = v_user_id) THEN
    RAISE NOTICE 'Profil déjà existant pour contact.parfury@gmail.com — aucune action';
    RETURN;
  END IF;

  -- Créer l'organisation
  INSERT INTO organizations (name, type)
  VALUES ('Test 12', 'cabinet')
  RETURNING id INTO v_org_id;

  RAISE NOTICE 'Organisation créée : % (id=%)', 'Test 12', v_org_id;

  -- Créer le profil utilisateur
  INSERT INTO user_profiles (user_id, org_id, role, prenom, nom)
  VALUES (v_user_id, v_org_id, 'doctor', 'Oussama', 'Ajmil');

  RAISE NOTICE '✓ user_profile créé pour Oussama Ajmil';

  -- Créer le profil médecin (rpps et specialite nullable après fix 3)
  INSERT INTO doctors (user_id, org_id)
  VALUES (v_user_id, v_org_id);

  RAISE NOTICE '✓ doctors créé pour Oussama Ajmil';
  RAISE NOTICE 'Fix 4 terminé : données créées pour contact.parfury@gmail.com';

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Erreur Fix 4 : %', SQLERRM;
END $$;
