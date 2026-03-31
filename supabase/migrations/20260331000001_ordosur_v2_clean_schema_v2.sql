-- ============================================================
-- MIGRATION ORDOSUR v2.1 — Drop legacy + nouveau schéma propre
-- Date : 2026-03-31
-- ============================================================


-- ============================================================
-- ÉTAPE 1 : SUPPRESSION DES ANCIENNES TABLES ET FONCTIONS
-- CASCADE supprime automatiquement toutes les dépendances
-- (foreign keys, policies, triggers, indexes).
-- IF EXISTS évite l'erreur si une table n'existe pas.
-- ============================================================

-- Supprimer l'ancien trigger sur auth.users en premier
DROP TRIGGER IF EXISTS on_auth_user_created         ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_complete ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated          ON auth.users;

-- Supprimer les anciennes fonctions
DROP FUNCTION IF EXISTS get_my_org_id()              CASCADE;
DROP FUNCTION IF EXISTS get_my_role()                CASCADE;
DROP FUNCTION IF EXISTS handle_new_user()            CASCADE;
DROP FUNCTION IF EXISTS handle_new_user_complete()   CASCADE;
DROP FUNCTION IF EXISTS handle_updated_at()          CASCADE;
DROP FUNCTION IF EXISTS check_account_locked(text)   CASCADE;
DROP FUNCTION IF EXISTS record_login_attempt(text, boolean) CASCADE;
DROP FUNCTION IF EXISTS prevent_privilege_escalation() CASCADE;
DROP FUNCTION IF EXISTS is_admin()                   CASCADE;
DROP FUNCTION IF EXISTS is_doctor()                  CASCADE;
DROP FUNCTION IF EXISTS is_clinic()                  CASCADE;
DROP FUNCTION IF EXISTS create_mandatory_password_reset(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS log_auth_event(uuid, text, text, boolean, jsonb) CASCADE;

-- Supprimer les tables dans l'ordre (enfants avant parents)
-- Les tables de l'ancien système auth
DROP TABLE IF EXISTS authentication_events       CASCADE;
DROP TABLE IF EXISTS temporary_credentials       CASCADE;
DROP TABLE IF EXISTS password_reset_requirements CASCADE;
DROP TABLE IF EXISTS login_attempts              CASCADE;

-- Tables métier legacy et nouveau système
DROP TABLE IF EXISTS ordonnance_lignes           CASCADE;
DROP TABLE IF EXISTS ordonnances                 CASCADE;
DROP TABLE IF EXISTS prescriptions               CASCADE;
DROP TABLE IF EXISTS consultations               CASCADE;
DROP TABLE IF EXISTS interaction_logs            CASCADE;
DROP TABLE IF EXISTS patients                    CASCADE;
DROP TABLE IF EXISTS doctor_performance          CASCADE;
DROP TABLE IF EXISTS clinic_invitations          CASCADE;
DROP TABLE IF EXISTS sync_logs                   CASCADE;

-- Tables de profils
DROP TABLE IF EXISTS doctor_profiles             CASCADE;
DROP TABLE IF EXISTS clinic_profiles             CASCADE;
DROP TABLE IF EXISTS doctors                     CASCADE;
DROP TABLE IF EXISTS user_profiles               CASCADE;
DROP TABLE IF EXISTS profiles                    CASCADE;

-- Tables de référence
DROP TABLE IF EXISTS drug_interactions           CASCADE;
DROP TABLE IF EXISTS medications                 CASCADE;
DROP TABLE IF EXISTS medicaments                 CASCADE;

-- Tables de base
DROP TABLE IF EXISTS users                       CASCADE;
DROP TABLE IF EXISTS organizations               CASCADE;

-- Confirmation
DO $$ BEGIN RAISE NOTICE '✓ Toutes les anciennes tables supprimées'; END $$;


-- ============================================================
-- ÉTAPE 2 : CRÉATION DES NOUVELLES TABLES
-- Ordre obligatoire : organizations → user_profiles → rest
-- Les fonctions helper viennent APRÈS user_profiles car elles
-- lisent user_profiles.org_id (qui doit exister au moment de
-- la création de la fonction).
-- ============================================================


-- ------------------------------------------------------------
-- 2.1 : ORGANIZATIONS
-- ------------------------------------------------------------
CREATE TABLE organizations (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  type       text        NOT NULL CHECK (type IN ('cabinet', 'clinique')),
  siret      text,
  adresse    text,
  telephone  text,
  email      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_organizations_type ON organizations(type);

DO $$ BEGIN RAISE NOTICE '✓ Table organizations créée'; END $$;


-- ------------------------------------------------------------
-- 2.2 : USER_PROFILES
-- Doit exister AVANT les fonctions helper.
-- ------------------------------------------------------------
CREATE TABLE user_profiles (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id     uuid        NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  role       text        NOT NULL CHECK (role IN ('super_admin', 'clinic_admin', 'doctor')),
  prenom     text        NOT NULL,
  nom        text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_org_id  ON user_profiles(org_id);

DO $$ BEGIN RAISE NOTICE '✓ Table user_profiles créée'; END $$;


-- ============================================================
-- ÉTAPE 3 : FONCTIONS HELPER RLS
-- Créées ici — APRÈS user_profiles — car elles lisent org_id
-- et role depuis cette table. Si elles étaient créées avant,
-- PostgreSQL trouverait une table sans colonne org_id et
-- lancerait l'erreur "column org_id does not exist".
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id
  FROM user_profiles
  WHERE user_id = (SELECT auth.uid())
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM user_profiles
  WHERE user_id = (SELECT auth.uid())
$$;

DO $$ BEGIN RAISE NOTICE '✓ Fonctions helper créées'; END $$;


-- ============================================================
-- ÉTAPE 4 : RLS SUR ORGANIZATIONS ET USER_PROFILES
-- ============================================================

-- RLS organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orgs_select" ON organizations FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin' OR id = get_my_org_id());

CREATE POLICY "orgs_insert" ON organizations FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "orgs_update" ON organizations FOR UPDATE TO authenticated
  USING  (get_my_role() = 'super_admin' OR (get_my_role() = 'clinic_admin' AND id = get_my_org_id()))
  WITH CHECK (get_my_role() = 'super_admin' OR (get_my_role() = 'clinic_admin' AND id = get_my_org_id()));

CREATE POLICY "orgs_delete" ON organizations FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');

-- RLS user_profiles
-- IMPORTANT : ces policies N'utilisent PAS get_my_org_id()/get_my_role()
-- car ces fonctions lisent user_profiles → récursion infinie.
-- On fait les sous-requêtes directement sur la table.
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON user_profiles FOR SELECT TO authenticated
USING (
  -- Chacun voit son propre profil
  user_id = (SELECT auth.uid())
  -- clinic_admin voit tous les profils de son organisation
  OR EXISTS (
    SELECT 1 FROM user_profiles me
    WHERE me.user_id = (SELECT auth.uid())
      AND me.role = 'clinic_admin'
      AND me.org_id = org_id
  )
  -- super_admin voit tout
  OR EXISTS (
    SELECT 1 FROM user_profiles me
    WHERE me.user_id = (SELECT auth.uid())
      AND me.role = 'super_admin'
  )
);

-- INSERT : bloqué pour les clients directs (le trigger SECURITY DEFINER contourne RLS)
CREATE POLICY "profiles_insert" ON user_profiles FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles me
      WHERE me.user_id = (SELECT auth.uid()) AND me.role = 'super_admin'
    )
  );

CREATE POLICY "profiles_update" ON user_profiles FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles me WHERE me.user_id = (SELECT auth.uid()) AND me.role = 'clinic_admin' AND me.org_id = org_id)
    OR EXISTS (SELECT 1 FROM user_profiles me WHERE me.user_id = (SELECT auth.uid()) AND me.role = 'super_admin')
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM user_profiles me WHERE me.user_id = (SELECT auth.uid()) AND me.role = 'clinic_admin' AND me.org_id = org_id)
    OR EXISTS (SELECT 1 FROM user_profiles me WHERE me.user_id = (SELECT auth.uid()) AND me.role = 'super_admin')
  );

CREATE POLICY "profiles_delete" ON user_profiles FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles me
      WHERE me.user_id = (SELECT auth.uid()) AND me.role = 'super_admin'
    )
  );

-- Trigger anti-escalade : empêche toute modification de role ou org_id
-- sauf par un super_admin
CREATE OR REPLACE FUNCTION prevent_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.role <> OLD.role OR NEW.org_id <> OLD.org_id) THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = (SELECT auth.uid()) AND role = 'super_admin'
    ) THEN
      RAISE EXCEPTION 'Modification du rôle ou de l''organisation interdite (PRIV_ESC)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_privilege_escalation
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_privilege_escalation();

DO $$ BEGIN RAISE NOTICE '✓ RLS organizations + user_profiles activé'; END $$;


-- ============================================================
-- ÉTAPE 5 : TABLES MÉTIER + RLS
-- ============================================================

-- ------------------------------------------------------------
-- 5.1 : DOCTORS
-- ------------------------------------------------------------
CREATE TABLE doctors (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        UNIQUE NOT NULL REFERENCES auth.users(id)       ON DELETE CASCADE,
  org_id       uuid        NOT NULL      REFERENCES organizations(id)      ON DELETE RESTRICT,
  rpps         text        UNIQUE NOT NULL,
  specialite   text        NOT NULL,
  ordre_number text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_doctors_user_id ON doctors(user_id);
CREATE INDEX idx_doctors_org_id  ON doctors(org_id);
CREATE INDEX idx_doctors_rpps    ON doctors(rpps);

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doctors_select" ON doctors FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin' OR org_id = get_my_org_id());

CREATE POLICY "doctors_insert" ON doctors FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() = 'super_admin'
    OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id())
  );

CREATE POLICY "doctors_update" ON doctors FOR UPDATE TO authenticated
  USING  (get_my_role() = 'super_admin' OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id()) OR user_id = (SELECT auth.uid()))
  WITH CHECK (get_my_role() = 'super_admin' OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id()) OR user_id = (SELECT auth.uid()));

CREATE POLICY "doctors_delete" ON doctors FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin' OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id()));


-- ------------------------------------------------------------
-- 5.2 : PATIENTS
-- ------------------------------------------------------------
CREATE TABLE patients (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid        NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  prenom         text        NOT NULL,
  nom            text        NOT NULL,
  date_naissance date,
  sexe           text        CHECK (sexe IN ('M', 'F', 'Autre')),
  telephone      text,
  email          text,
  adresse        text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_patients_org_id ON patients(org_id);
CREATE INDEX idx_patients_nom    ON patients(nom, prenom);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patients_select" ON patients FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin' OR org_id = get_my_org_id());

CREATE POLICY "patients_insert" ON patients FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() = 'super_admin'
    OR (org_id = get_my_org_id() AND get_my_role() IN ('clinic_admin', 'doctor'))
  );

CREATE POLICY "patients_update" ON patients FOR UPDATE TO authenticated
  USING  (get_my_role() = 'super_admin' OR (org_id = get_my_org_id() AND get_my_role() IN ('clinic_admin', 'doctor')))
  WITH CHECK (get_my_role() = 'super_admin' OR (org_id = get_my_org_id() AND get_my_role() IN ('clinic_admin', 'doctor')));

-- Suppression : clinic_admin et super_admin uniquement
CREATE POLICY "patients_delete" ON patients FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin' OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id()));


-- ------------------------------------------------------------
-- 5.3 : CONSULTATIONS
-- ------------------------------------------------------------
CREATE TABLE consultations (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid        NOT NULL REFERENCES patients(id)       ON DELETE CASCADE,
  doctor_id  uuid        NOT NULL REFERENCES doctors(id)        ON DELETE RESTRICT,
  org_id     uuid        NOT NULL REFERENCES organizations(id)  ON DELETE RESTRICT,
  date       timestamptz NOT NULL DEFAULT now(),
  motif      text,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_consultations_patient_id ON consultations(patient_id);
CREATE INDEX idx_consultations_doctor_id  ON consultations(doctor_id);
CREATE INDEX idx_consultations_org_id     ON consultations(org_id);
CREATE INDEX idx_consultations_date       ON consultations(date DESC);

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

-- Lecture : tous les membres de l'org voient toutes les consultations
CREATE POLICY "consultations_select" ON consultations FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin' OR org_id = get_my_org_id());

-- Création : un médecin ne crée que SES consultations (doctor_id = son propre id)
CREATE POLICY "consultations_insert" ON consultations FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() = 'super_admin'
    OR (
      org_id = get_my_org_id()
      AND doctor_id = (SELECT id FROM doctors WHERE user_id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "consultations_update" ON consultations FOR UPDATE TO authenticated
  USING  (get_my_role() = 'super_admin' OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id()) OR doctor_id = (SELECT id FROM doctors WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (get_my_role() = 'super_admin' OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id()) OR doctor_id = (SELECT id FROM doctors WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "consultations_delete" ON consultations FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin' OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id()) OR doctor_id = (SELECT id FROM doctors WHERE user_id = (SELECT auth.uid())));


-- ------------------------------------------------------------
-- 5.4 : ORDONNANCES
-- ------------------------------------------------------------
CREATE TABLE ordonnances (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid        REFERENCES consultations(id)      ON DELETE SET NULL,
  patient_id      uuid        NOT NULL REFERENCES patients(id)      ON DELETE CASCADE,
  doctor_id       uuid        NOT NULL REFERENCES doctors(id)       ON DELETE RESTRICT,
  org_id          uuid        NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  date            timestamptz NOT NULL DEFAULT now(),
  statut          text        NOT NULL DEFAULT 'active'
                              CHECK (statut IN ('active', 'annulee', 'expiree')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ordonnances_patient_id      ON ordonnances(patient_id);
CREATE INDEX idx_ordonnances_doctor_id       ON ordonnances(doctor_id);
CREATE INDEX idx_ordonnances_org_id          ON ordonnances(org_id);
CREATE INDEX idx_ordonnances_consultation_id ON ordonnances(consultation_id);
CREATE INDEX idx_ordonnances_date            ON ordonnances(date DESC);

ALTER TABLE ordonnances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ordonnances_select" ON ordonnances FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin' OR org_id = get_my_org_id());

CREATE POLICY "ordonnances_insert" ON ordonnances FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() = 'super_admin'
    OR (
      org_id = get_my_org_id()
      AND doctor_id = (SELECT id FROM doctors WHERE user_id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "ordonnances_update" ON ordonnances FOR UPDATE TO authenticated
  USING  (get_my_role() = 'super_admin' OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id()) OR doctor_id = (SELECT id FROM doctors WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (get_my_role() = 'super_admin' OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id()) OR doctor_id = (SELECT id FROM doctors WHERE user_id = (SELECT auth.uid())));

CREATE POLICY "ordonnances_delete" ON ordonnances FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin' OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id()) OR doctor_id = (SELECT id FROM doctors WHERE user_id = (SELECT auth.uid())));


-- ------------------------------------------------------------
-- 5.5 : ORDONNANCE_LIGNES
-- Table enfant pure — accès contrôlé via l'ordonnance parente
-- ------------------------------------------------------------
CREATE TABLE ordonnance_lignes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordonnance_id  uuid NOT NULL REFERENCES ordonnances(id) ON DELETE CASCADE,
  medicament_nom text NOT NULL,
  posologie      text NOT NULL,
  duree          text,
  instructions   text
);

CREATE INDEX idx_ordonnance_lignes_ordonnance_id ON ordonnance_lignes(ordonnance_id);

ALTER TABLE ordonnance_lignes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lignes_select" ON ordonnance_lignes FOR SELECT TO authenticated
  USING (ordonnance_id IN (
    SELECT id FROM ordonnances WHERE get_my_role() = 'super_admin' OR org_id = get_my_org_id()
  ));

CREATE POLICY "lignes_insert" ON ordonnance_lignes FOR INSERT TO authenticated
  WITH CHECK (ordonnance_id IN (
    SELECT id FROM ordonnances
    WHERE get_my_role() = 'super_admin'
       OR (org_id = get_my_org_id() AND doctor_id = (SELECT id FROM doctors WHERE user_id = (SELECT auth.uid())))
  ));

CREATE POLICY "lignes_update" ON ordonnance_lignes FOR UPDATE TO authenticated
  USING (ordonnance_id IN (
    SELECT id FROM ordonnances
    WHERE get_my_role() = 'super_admin'
       OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id())
       OR doctor_id = (SELECT id FROM doctors WHERE user_id = (SELECT auth.uid()))
  ));

CREATE POLICY "lignes_delete" ON ordonnance_lignes FOR DELETE TO authenticated
  USING (ordonnance_id IN (
    SELECT id FROM ordonnances
    WHERE get_my_role() = 'super_admin'
       OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id())
       OR doctor_id = (SELECT id FROM doctors WHERE user_id = (SELECT auth.uid()))
  ));


-- ------------------------------------------------------------
-- 5.6 : MEDICAMENTS (référentiel — lecture seule pour tous)
-- ------------------------------------------------------------
CREATE TABLE medicaments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nom        text        NOT NULL,
  dci        text,
  forme      text,
  dosage     text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_medicaments_nom ON medicaments(nom text_pattern_ops);
CREATE INDEX idx_medicaments_dci ON medicaments(dci);

ALTER TABLE medicaments ENABLE ROW LEVEL SECURITY;

-- Lecture pour tous les authentifiés
CREATE POLICY "medicaments_select" ON medicaments FOR SELECT TO authenticated USING (true);
-- Écriture réservée au super_admin (ou via service_role depuis un script)
CREATE POLICY "medicaments_insert" ON medicaments FOR INSERT TO authenticated WITH CHECK (get_my_role() = 'super_admin');
CREATE POLICY "medicaments_update" ON medicaments FOR UPDATE TO authenticated USING (get_my_role() = 'super_admin');
CREATE POLICY "medicaments_delete" ON medicaments FOR DELETE TO authenticated USING (get_my_role() = 'super_admin');

DO $$ BEGIN RAISE NOTICE '✓ Tables métier + RLS créés'; END $$;


-- ============================================================
-- ÉTAPE 6 : TRIGGER SIGNUP
-- Crée automatiquement un user_profile à chaque inscription.
-- Sécurité : super_admin ne peut pas être créé via signup public.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role   text;
  v_org_id uuid;
  v_prenom text;
  v_nom    text;
BEGIN
  v_role   := COALESCE(NEW.raw_user_meta_data->>'role', 'doctor');
  v_org_id := (NEW.raw_user_meta_data->>'org_id')::uuid;
  v_prenom := COALESCE(NEW.raw_user_meta_data->>'prenom', '');
  v_nom    := COALESCE(NEW.raw_user_meta_data->>'nom', '');

  -- Empêche la création d'un super_admin via signup public
  IF v_role NOT IN ('clinic_admin', 'doctor') THEN
    v_role := 'doctor';
  END IF;

  IF v_org_id IS NOT NULL THEN
    INSERT INTO public.user_profiles (user_id, org_id, role, prenom, nom)
    VALUES (NEW.id, v_org_id, v_role, v_prenom, v_nom)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

DO $$ BEGIN RAISE NOTICE '✓ Trigger signup créé'; END $$;


-- ============================================================
-- ÉTAPE 7 : VÉRIFICATION FINALE
-- ============================================================
DO $$
DECLARE
  t      text;
  rls_ok boolean;
  cnt    integer;
  tables text[] := ARRAY[
    'organizations', 'user_profiles', 'doctors', 'patients',
    'consultations', 'ordonnances', 'ordonnance_lignes', 'medicaments'
  ];
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '   RAPPORT FINAL — Ordosur v2          ';
  RAISE NOTICE '========================================';

  FOREACH t IN ARRAY tables LOOP
    SELECT relrowsecurity INTO rls_ok
    FROM pg_class
    WHERE relname = t AND relnamespace = 'public'::regnamespace;

    IF rls_ok THEN
      RAISE NOTICE '✓  %-25s RLS activé', t;
    ELSE
      RAISE WARNING '✗  %-25s RLS MANQUANT !', t;
    END IF;
  END LOOP;

  SELECT COUNT(*) INTO cnt FROM pg_policies WHERE schemaname = 'public';
  RAISE NOTICE '';
  RAISE NOTICE 'Policies RLS créées : %', cnt;

  SELECT COUNT(*) INTO cnt FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  RAISE NOTICE 'Tables publiques    : %', cnt;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration terminée avec succès.';
  RAISE NOTICE '========================================';
END $$;
