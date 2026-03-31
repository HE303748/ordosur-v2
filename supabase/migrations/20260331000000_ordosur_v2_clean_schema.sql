-- ============================================================
-- MIGRATION ORDOSUR v2 — Schéma propre et sécurisé
-- Date : 2026-03-31
-- Remplace l'intégralité des tables legacy par une architecture
-- org-centric avec RLS strict sur chaque table.
-- ============================================================


-- ============================================================
-- PARTIE 0 : FONCTIONS HELPER RLS
-- Créées EN PREMIER — utilisées par toutes les policies ensuite.
-- SECURITY DEFINER : s'exécutent en tant que propriétaire de la
-- fonction, donc elles lisent user_profiles sans déclencher RLS
-- sur cette table (ce qui causerait une récursion infinie).
-- STABLE : PostgreSQL peut réutiliser le résultat dans la même
-- requête → un seul aller-retour en base par requête, pas un par ligne.
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


-- ============================================================
-- PARTIE 1 : ORGANIZATIONS
-- ============================================================

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

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orgs_select" ON organizations FOR SELECT TO authenticated
USING (
  get_my_role() = 'super_admin'
  OR id = get_my_org_id()
);

CREATE POLICY "orgs_insert" ON organizations FOR INSERT TO authenticated
WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "orgs_update" ON organizations FOR UPDATE TO authenticated
USING (
  get_my_role() = 'super_admin'
  OR (get_my_role() = 'clinic_admin' AND id = get_my_org_id())
)
WITH CHECK (
  get_my_role() = 'super_admin'
  OR (get_my_role() = 'clinic_admin' AND id = get_my_org_id())
);

CREATE POLICY "orgs_delete" ON organizations FOR DELETE TO authenticated
USING (get_my_role() = 'super_admin');


-- ============================================================
-- PARTIE 2 : USER_PROFILES
--
-- ATTENTION : les policies de cette table ne peuvent PAS utiliser
-- get_my_org_id() / get_my_role() car ces fonctions lisent
-- user_profiles → récursion infinie garantie.
-- On fait les sous-requêtes directement ici.
-- ============================================================

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

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- SELECT simplifié :
--   doctor       → voit uniquement son propre profil
--   clinic_admin → voit tous les profils de son org
--   super_admin  → voit tout
CREATE POLICY "profiles_select" ON user_profiles FOR SELECT TO authenticated
USING (
  -- Son propre profil (tous rôles confondus)
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

-- INSERT : géré par le trigger handle_new_user (SECURITY DEFINER, bypass RLS).
-- Ce policy bloque les inserts directs depuis le client (hors super_admin).
CREATE POLICY "profiles_insert" ON user_profiles FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles me
    WHERE me.user_id = (SELECT auth.uid()) AND me.role = 'super_admin'
  )
);

-- UPDATE : chacun peut modifier son prenom/nom.
-- clinic_admin peut modifier les profils de son org.
-- La protection de role/org_id est assurée par le trigger ci-dessous.
CREATE POLICY "profiles_update" ON user_profiles FOR UPDATE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM user_profiles me
    WHERE me.user_id = (SELECT auth.uid())
      AND me.role = 'clinic_admin'
      AND me.org_id = org_id
  )
  OR EXISTS (
    SELECT 1 FROM user_profiles me
    WHERE me.user_id = (SELECT auth.uid())
      AND me.role = 'super_admin'
  )
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM user_profiles me
    WHERE me.user_id = (SELECT auth.uid())
      AND me.role = 'clinic_admin'
      AND me.org_id = org_id
  )
  OR EXISTS (
    SELECT 1 FROM user_profiles me
    WHERE me.user_id = (SELECT auth.uid())
      AND me.role = 'super_admin'
  )
);

CREATE POLICY "profiles_delete" ON user_profiles FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles me
    WHERE me.user_id = (SELECT auth.uid()) AND me.role = 'super_admin'
  )
);

-- ----------------------------------------------------------
-- TRIGGER ANTI-ESCALADE DE PRIVILÈGES
-- Empêche quiconque (y compris un clinic_admin) de modifier
-- son propre rôle ou son org_id via un UPDATE, sauf super_admin.
-- ----------------------------------------------------------
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


-- ============================================================
-- PARTIE 3 : DOCTORS
-- ============================================================

CREATE TABLE doctors (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id       uuid        NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
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
USING (
  get_my_role() = 'super_admin'
  OR org_id = get_my_org_id()
);

CREATE POLICY "doctors_insert" ON doctors FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() = 'super_admin'
  OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id())
);

CREATE POLICY "doctors_update" ON doctors FOR UPDATE TO authenticated
USING (
  get_my_role() = 'super_admin'
  OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id())
  OR user_id = (SELECT auth.uid())
)
WITH CHECK (
  get_my_role() = 'super_admin'
  OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id())
  OR user_id = (SELECT auth.uid())
);

CREATE POLICY "doctors_delete" ON doctors FOR DELETE TO authenticated
USING (
  get_my_role() = 'super_admin'
  OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id())
);


-- ============================================================
-- PARTIE 4 : PATIENTS
-- ============================================================

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

-- Tous les membres d'une org voient tous les patients de leur org
-- (un médecin peut voir les patients créés par ses collègues)
CREATE POLICY "patients_select" ON patients FOR SELECT TO authenticated
USING (
  get_my_role() = 'super_admin'
  OR org_id = get_my_org_id()
);

CREATE POLICY "patients_insert" ON patients FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() = 'super_admin'
  OR (
    org_id = get_my_org_id()
    AND get_my_role() IN ('clinic_admin', 'doctor')
  )
);

CREATE POLICY "patients_update" ON patients FOR UPDATE TO authenticated
USING (
  get_my_role() = 'super_admin'
  OR (org_id = get_my_org_id() AND get_my_role() IN ('clinic_admin', 'doctor'))
)
WITH CHECK (
  get_my_role() = 'super_admin'
  OR (org_id = get_my_org_id() AND get_my_role() IN ('clinic_admin', 'doctor'))
);

-- Suppression réservée au clinic_admin et super_admin
CREATE POLICY "patients_delete" ON patients FOR DELETE TO authenticated
USING (
  get_my_role() = 'super_admin'
  OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id())
);


-- ============================================================
-- PARTIE 5 : CONSULTATIONS
-- ============================================================

CREATE TABLE consultations (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid        NOT NULL REFERENCES patients(id)      ON DELETE CASCADE,
  doctor_id  uuid        NOT NULL REFERENCES doctors(id)       ON DELETE RESTRICT,
  org_id     uuid        NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
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

-- Lecture : toute l'org (un médecin peut voir les consultations de ses collègues)
CREATE POLICY "consultations_select" ON consultations FOR SELECT TO authenticated
USING (
  get_my_role() = 'super_admin'
  OR org_id = get_my_org_id()
);

-- Création : un médecin ne peut créer que SES PROPRES consultations
CREATE POLICY "consultations_insert" ON consultations FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() = 'super_admin'
  OR (
    org_id = get_my_org_id()
    AND doctor_id = (SELECT id FROM doctors WHERE user_id = (SELECT auth.uid()))
  )
);

-- Modification : auteur ou clinic_admin de l'org
CREATE POLICY "consultations_update" ON consultations FOR UPDATE TO authenticated
USING (
  get_my_role() = 'super_admin'
  OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id())
  OR doctor_id = (SELECT id FROM doctors WHERE user_id = (SELECT auth.uid()))
)
WITH CHECK (
  get_my_role() = 'super_admin'
  OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id())
  OR doctor_id = (SELECT id FROM doctors WHERE user_id = (SELECT auth.uid()))
);

CREATE POLICY "consultations_delete" ON consultations FOR DELETE TO authenticated
USING (
  get_my_role() = 'super_admin'
  OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id())
  OR doctor_id = (SELECT id FROM doctors WHERE user_id = (SELECT auth.uid()))
);


-- ============================================================
-- PARTIE 6 : ORDONNANCES
-- ============================================================

CREATE TABLE ordonnances (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid        REFERENCES consultations(id)     ON DELETE SET NULL,
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
USING (
  get_my_role() = 'super_admin'
  OR org_id = get_my_org_id()
);

CREATE POLICY "ordonnances_insert" ON ordonnances FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() = 'super_admin'
  OR (
    org_id = get_my_org_id()
    AND doctor_id = (SELECT id FROM doctors WHERE user_id = (SELECT auth.uid()))
  )
);

CREATE POLICY "ordonnances_update" ON ordonnances FOR UPDATE TO authenticated
USING (
  get_my_role() = 'super_admin'
  OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id())
  OR doctor_id = (SELECT id FROM doctors WHERE user_id = (SELECT auth.uid()))
)
WITH CHECK (
  get_my_role() = 'super_admin'
  OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id())
  OR doctor_id = (SELECT id FROM doctors WHERE user_id = (SELECT auth.uid()))
);

CREATE POLICY "ordonnances_delete" ON ordonnances FOR DELETE TO authenticated
USING (
  get_my_role() = 'super_admin'
  OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id())
  OR doctor_id = (SELECT id FROM doctors WHERE user_id = (SELECT auth.uid()))
);


-- ============================================================
-- PARTIE 7 : ORDONNANCE_LIGNES
-- Table enfant pure — pas d'org_id, accès via l'ordonnance parente
-- ============================================================

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
USING (
  ordonnance_id IN (
    SELECT id FROM ordonnances
    WHERE get_my_role() = 'super_admin' OR org_id = get_my_org_id()
  )
);

CREATE POLICY "lignes_insert" ON ordonnance_lignes FOR INSERT TO authenticated
WITH CHECK (
  ordonnance_id IN (
    SELECT id FROM ordonnances
    WHERE
      get_my_role() = 'super_admin'
      OR (
        org_id = get_my_org_id()
        AND doctor_id = (SELECT id FROM doctors WHERE user_id = (SELECT auth.uid()))
      )
  )
);

CREATE POLICY "lignes_update" ON ordonnance_lignes FOR UPDATE TO authenticated
USING (
  ordonnance_id IN (
    SELECT id FROM ordonnances
    WHERE
      get_my_role() = 'super_admin'
      OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id())
      OR doctor_id = (SELECT id FROM doctors WHERE user_id = (SELECT auth.uid()))
  )
);

CREATE POLICY "lignes_delete" ON ordonnance_lignes FOR DELETE TO authenticated
USING (
  ordonnance_id IN (
    SELECT id FROM ordonnances
    WHERE
      get_my_role() = 'super_admin'
      OR (get_my_role() = 'clinic_admin' AND org_id = get_my_org_id())
      OR doctor_id = (SELECT id FROM doctors WHERE user_id = (SELECT auth.uid()))
  )
);


-- ============================================================
-- PARTIE 8 : MEDICAMENTS (référentiel — lecture seule)
-- ============================================================

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

-- Tous les utilisateurs authentifiés peuvent lire
CREATE POLICY "medicaments_select" ON medicaments FOR SELECT TO authenticated
USING (true);

-- Écriture : super_admin uniquement (ou via service_role depuis un script d'import)
CREATE POLICY "medicaments_insert" ON medicaments FOR INSERT TO authenticated
WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "medicaments_update" ON medicaments FOR UPDATE TO authenticated
USING (get_my_role() = 'super_admin');

CREATE POLICY "medicaments_delete" ON medicaments FOR DELETE TO authenticated
USING (get_my_role() = 'super_admin');


-- ============================================================
-- PARTIE 9 : TRIGGER — Création automatique du user_profile
--
-- Déclenché automatiquement à chaque inscription Supabase Auth.
-- Les champs org_id, role, prenom, nom doivent être passés dans
-- les métadonnées au moment du signUp :
--
--   supabase.auth.signUp({
--     email, password,
--     options: {
--       data: {
--         org_id: "uuid-de-lorg",
--         role: "doctor",          // ou "clinic_admin"
--         prenom: "Jean",
--         nom: "Dupont"
--       }
--     }
--   })
--
-- SÉCURITÉ : le rôle 'super_admin' est INTERDIT via signup public.
-- Tout signup tentant de s'attribuer ce rôle sera rétrogradé à 'doctor'.
-- Les super_admin sont créés manuellement dans le Dashboard Supabase.
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

  -- Sécurité : empêche le signup public de créer un super_admin
  IF v_role NOT IN ('clinic_admin', 'doctor') THEN
    v_role := 'doctor';
  END IF;

  -- Crée le profil uniquement si org_id est fourni
  -- (les invitations sans org_id sont gérées séparément via Edge Function)
  IF v_org_id IS NOT NULL THEN
    INSERT INTO public.user_profiles (user_id, org_id, role, prenom, nom)
    VALUES (NEW.id, v_org_id, v_role, v_prenom, v_nom)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- VÉRIFICATION FINALE
-- Contrôle que RLS est bien activé sur toutes les tables
-- ============================================================
DO $$
DECLARE
  t      text;
  rls_ok boolean;
  tables text[] := ARRAY[
    'organizations', 'user_profiles', 'doctors', 'patients',
    'consultations', 'ordonnances', 'ordonnance_lignes', 'medicaments'
  ];
BEGIN
  RAISE NOTICE '=== Vérification schéma Ordosur v2 ===';
  FOREACH t IN ARRAY tables LOOP
    SELECT relrowsecurity INTO rls_ok
    FROM pg_class
    WHERE relname = t AND relnamespace = 'public'::regnamespace;

    IF rls_ok THEN
      RAISE NOTICE '✓  % — RLS activé', t;
    ELSE
      RAISE WARNING '✗  % — RLS MANQUANT !', t;
    END IF;
  END LOOP;
  RAISE NOTICE '=== Fin OK ===';
END $$;
