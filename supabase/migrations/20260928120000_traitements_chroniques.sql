-- Sprint 3 — Traitement de fond structuré + vérification croisée
--
-- Remplace, pour le moteur, le texte libre patients.traitements_en_cours (conservé en
-- lecture seule, jamais parsé). Jamais de suppression physique : arrêt = actif false.
--
-- Droits d'écriture : l'utilisateur doit posséder une ligne `doctors` dans l'org de la
-- ligne ET ne pas être secrétaire. Les rôles sont stockés dans user_profiles.role (valeur
-- unique) : un clinic_admin médecin a role = 'clinic_admin' + une ligne doctors → peut
-- écrire ; un clinic_admin sans ligne doctors → lecture seule.

CREATE TABLE IF NOT EXISTS public.traitements_chroniques (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id            uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  org_id                uuid NOT NULL REFERENCES public.organizations(id),
  doctor_id             uuid NOT NULL REFERENCES public.doctors(id),
  medicament_id         uuid NULL REFERENCES public.medicaments(id) ON DELETE SET NULL,
  medicament_nom        text NOT NULL CHECK (length(trim(medicament_nom)) > 0),
  posologie             text NULL,
  date_debut            date NULL,
  actif                 boolean NOT NULL DEFAULT true,
  date_arret            date NULL,
  arrete_par_doctor_id  uuid NULL REFERENCES public.doctors(id),
  notes                 text NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT traitements_chroniques_arret_coherent CHECK (actif OR date_arret IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS traitements_chroniques_patient_idx
  ON public.traitements_chroniques (patient_id);
CREATE INDEX IF NOT EXISTS traitements_chroniques_patient_actif_idx
  ON public.traitements_chroniques (patient_id) WHERE actif;

CREATE OR REPLACE FUNCTION public.traitements_chroniques_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS traitements_chroniques_updated_at ON public.traitements_chroniques;
CREATE TRIGGER traitements_chroniques_updated_at
  BEFORE UPDATE ON public.traitements_chroniques
  FOR EACH ROW EXECUTE FUNCTION public.traitements_chroniques_set_updated_at();

ALTER TABLE public.traitements_chroniques ENABLE ROW LEVEL SECURITY;

-- Lecture : membres de l'org (médecins, admins, secrétaires actives — get_my_org_id()
-- renvoie NULL pour une secrétaire inactive ou une org suspendue).
DROP POLICY IF EXISTS traitements_chroniques_select ON public.traitements_chroniques;
CREATE POLICY traitements_chroniques_select ON public.traitements_chroniques
  FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin' OR org_id = get_my_org_id());

-- Création : médecin de l'org, doctor_id = SA ligne doctors.
DROP POLICY IF EXISTS traitements_chroniques_insert ON public.traitements_chroniques;
CREATE POLICY traitements_chroniques_insert ON public.traitements_chroniques
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = get_my_org_id()
    AND coalesce(get_my_role(), '') <> 'secretaire'
    AND doctor_id IN (
      SELECT d.id FROM public.doctors d
      WHERE d.user_id = (SELECT auth.uid()) AND d.org_id = traitements_chroniques.org_id
    )
    AND arrete_par_doctor_id IS NULL
  );

-- Mise à jour (dont « Arrêter ») : tout médecin de l'org. arrete_par_doctor_id, s'il est
-- renseigné, doit être la ligne doctors de l'utilisateur ou rester inchangé (contrôlé
-- côté trigger ci-dessous pour garder la policy simple).
DROP POLICY IF EXISTS traitements_chroniques_update ON public.traitements_chroniques;
CREATE POLICY traitements_chroniques_update ON public.traitements_chroniques
  FOR UPDATE TO authenticated
  USING (
    org_id = get_my_org_id()
    AND coalesce(get_my_role(), '') <> 'secretaire'
    AND EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.user_id = (SELECT auth.uid()) AND d.org_id = traitements_chroniques.org_id
    )
  )
  WITH CHECK (
    org_id = get_my_org_id()
    AND coalesce(get_my_role(), '') <> 'secretaire'
    AND EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.user_id = (SELECT auth.uid()) AND d.org_id = traitements_chroniques.org_id
    )
  );

-- Aucune policy DELETE : suppression physique impossible côté client.

-- Garde-fous d'intégrité à la mise à jour : l'auteur, le patient et l'org sont figés ;
-- arrete_par_doctor_id ne peut être posé que par le médecin connecté ; pas de réactivation
-- silencieuse d'un traitement arrêté (un traitement repris = nouvelle ligne).
CREATE OR REPLACE FUNCTION public.traitements_chroniques_guard_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_my_doctor uuid;
BEGIN
  IF NEW.doctor_id <> OLD.doctor_id OR NEW.patient_id <> OLD.patient_id OR NEW.org_id <> OLD.org_id THEN
    RAISE EXCEPTION 'traitements_chroniques : auteur, patient et organisation non modifiables';
  END IF;
  IF OLD.actif = false AND NEW.actif = true THEN
    RAISE EXCEPTION 'traitements_chroniques : un traitement arrêté ne peut pas être réactivé';
  END IF;
  IF NEW.arrete_par_doctor_id IS DISTINCT FROM OLD.arrete_par_doctor_id AND auth.uid() IS NOT NULL THEN
    SELECT d.id INTO v_my_doctor FROM doctors d
      WHERE d.user_id = auth.uid() AND d.org_id = NEW.org_id LIMIT 1;
    IF NEW.arrete_par_doctor_id IS NULL OR NEW.arrete_par_doctor_id <> v_my_doctor THEN
      RAISE EXCEPTION 'traitements_chroniques : arrete_par_doctor_id doit être le médecin connecté';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS traitements_chroniques_guard ON public.traitements_chroniques;
CREATE TRIGGER traitements_chroniques_guard
  BEFORE UPDATE ON public.traitements_chroniques
  FOR EACH ROW EXECUTE FUNCTION public.traitements_chroniques_guard_update();

-- Journal : distingue les alertes « avec traitement de fond ». NULL = historique.
ALTER TABLE public.interaction_logs ADD COLUMN IF NOT EXISTS source text NULL;
