-- Sprint 4 — Antécédents structurés + dates des pathologies actives
--
-- • Table antecedents : historique médical, chirurgical, familial, toxique et
--   gynéco-obstétrical. INFORMATION UNIQUEMENT : le moteur de sécurité ne la lit pas
--   (les pathologies actives restent dans patients.pathologies, seule source du moteur).
-- • Jamais de suppression physique : une erreur de saisie s'archive (archive = true,
--   archive_par_doctor_id = médecin connecté). Pas de désarchivage.
-- • Droits : identiques à traitements_chroniques (Sprint 3) — lecture org ; écriture par un
--   utilisateur possédant une ligne doctors dans l'org ET non secrétaire.
-- • patients.pathologies_depuis : { "<libellé exact de patients.pathologies>": année }.
--   Affichage / lettre d'adressage uniquement ; le moteur ne la lit pas.

CREATE TABLE IF NOT EXISTS public.antecedents (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id             uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  org_id                 uuid NOT NULL REFERENCES public.organizations(id),
  doctor_id              uuid NOT NULL REFERENCES public.doctors(id),
  categorie              text NOT NULL CHECK (categorie IN ('medical', 'chirurgical', 'familial', 'toxique', 'gyneco_obstetrical')),
  libelle                text NOT NULL CHECK (length(trim(libelle)) > 0 AND length(libelle) <= 200),
  pathologie_curee_id    uuid NULL REFERENCES public.pathologies_curees(id) ON DELETE SET NULL,
  date_debut_annee       smallint NULL CHECK (date_debut_annee BETWEEN 1900 AND 2100),
  date_debut             date NULL,
  date_fin_annee         smallint NULL CHECK (date_fin_annee BETWEEN 1900 AND 2100),
  en_cours               boolean NULL, -- NULL = non renseigné
  details                jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes                  text NULL,
  archive                boolean NOT NULL DEFAULT false,
  archive_par_doctor_id  uuid NULL REFERENCES public.doctors(id),
  archive_motif          text NULL,
  archive_le             timestamptz NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT antecedents_details_objet CHECK (
    jsonb_typeof(details) = 'object'
    AND (NOT (details ? 'type') OR details->>'type' IN ('tabac', 'alcool', 'phyto', 'cancer'))
  ),
  CONSTRAINT antecedents_date_coherente CHECK (
    date_debut IS NULL
    OR (date_debut_annee IS NOT NULL AND extract(year FROM date_debut)::int = date_debut_annee)
  ),
  CONSTRAINT antecedents_fin_coherente CHECK (
    date_fin_annee IS NULL OR date_debut_annee IS NULL OR date_fin_annee >= date_debut_annee
  ),
  CONSTRAINT antecedents_archive_coherent CHECK (NOT archive OR archive_par_doctor_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS antecedents_patient_idx
  ON public.antecedents (patient_id);
CREATE INDEX IF NOT EXISTS antecedents_patient_actifs_idx
  ON public.antecedents (patient_id) WHERE NOT archive;

CREATE OR REPLACE FUNCTION public.antecedents_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS antecedents_updated_at ON public.antecedents;
CREATE TRIGGER antecedents_updated_at
  BEFORE UPDATE ON public.antecedents
  FOR EACH ROW EXECUTE FUNCTION public.antecedents_set_updated_at();

ALTER TABLE public.antecedents ENABLE ROW LEVEL SECURITY;

-- Lecture : membres de l'org (médecins, admins, secrétaires actives).
DROP POLICY IF EXISTS antecedents_select ON public.antecedents;
CREATE POLICY antecedents_select ON public.antecedents
  FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin' OR org_id = get_my_org_id());

-- Création : médecin de l'org, doctor_id = SA ligne doctors, jamais déjà archivé.
DROP POLICY IF EXISTS antecedents_insert ON public.antecedents;
CREATE POLICY antecedents_insert ON public.antecedents
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = get_my_org_id()
    AND coalesce(get_my_role(), '') <> 'secretaire'
    AND doctor_id IN (
      SELECT d.id FROM public.doctors d
      WHERE d.user_id = (SELECT auth.uid()) AND d.org_id = antecedents.org_id
    )
    AND archive = false
    AND archive_par_doctor_id IS NULL
  );

-- Mise à jour (modification, archivage) : tout médecin de l'org.
DROP POLICY IF EXISTS antecedents_update ON public.antecedents;
CREATE POLICY antecedents_update ON public.antecedents
  FOR UPDATE TO authenticated
  USING (
    org_id = get_my_org_id()
    AND coalesce(get_my_role(), '') <> 'secretaire'
    AND EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.user_id = (SELECT auth.uid()) AND d.org_id = antecedents.org_id
    )
  )
  WITH CHECK (
    org_id = get_my_org_id()
    AND coalesce(get_my_role(), '') <> 'secretaire'
    AND EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.user_id = (SELECT auth.uid()) AND d.org_id = antecedents.org_id
    )
  );

-- Aucune policy DELETE : suppression physique impossible côté client.

-- Garde-fous : auteur / patient / org figés ; ligne archivée figée (pas de désarchivage,
-- pas de modification) ; archive_par_doctor_id = médecin connecté.
CREATE OR REPLACE FUNCTION public.antecedents_guard_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_my_doctor uuid;
BEGIN
  IF NEW.doctor_id <> OLD.doctor_id OR NEW.patient_id <> OLD.patient_id OR NEW.org_id <> OLD.org_id THEN
    RAISE EXCEPTION 'antecedents : auteur, patient et organisation non modifiables';
  END IF;
  IF OLD.archive THEN
    RAISE EXCEPTION 'antecedents : un antécédent archivé ne peut plus être modifié';
  END IF;
  IF NEW.archive_par_doctor_id IS DISTINCT FROM OLD.archive_par_doctor_id AND auth.uid() IS NOT NULL THEN
    SELECT d.id INTO v_my_doctor FROM doctors d
      WHERE d.user_id = auth.uid() AND d.org_id = NEW.org_id LIMIT 1;
    IF NEW.archive_par_doctor_id IS NULL OR NEW.archive_par_doctor_id <> v_my_doctor THEN
      RAISE EXCEPTION 'antecedents : archive_par_doctor_id doit être le médecin connecté';
    END IF;
  END IF;
  IF NEW.archive AND NOT OLD.archive THEN
    NEW.archive_le := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS antecedents_guard ON public.antecedents;
CREATE TRIGGER antecedents_guard
  BEFORE UPDATE ON public.antecedents
  FOR EACH ROW EXECUTE FUNCTION public.antecedents_guard_update();

-- Dates de diagnostic des pathologies actives (affichage uniquement).
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS pathologies_depuis jsonb NULL;
ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS patients_pathologies_depuis_objet;
ALTER TABLE public.patients ADD CONSTRAINT patients_pathologies_depuis_objet
  CHECK (pathologies_depuis IS NULL OR jsonb_typeof(pathologies_depuis) = 'object');
