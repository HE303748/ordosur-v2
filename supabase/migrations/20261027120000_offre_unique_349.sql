-- Offre unique Ordosur : 349 DH HT / mois / médecin (annuel 3 490 DH HT), essai 30 jours.
-- Sources des montants côté client : src/lib/pricing.ts (PRICE_MONTHLY_HT, PRICE_YEARLY_HT, TRIAL_DAYS).
-- Aucune politique RLS, ni get_my_org_id(), ni mécanisme de suspension n'est modifié ici.

-- A. plan = périodicité de facturation de l'offre unique
ALTER TABLE organizations DROP CONSTRAINT organizations_plan_check;
UPDATE organizations SET plan = 'mensuel' WHERE plan IN ('starter', 'pro', 'clinique');
ALTER TABLE organizations ADD CONSTRAINT organizations_plan_check
  CHECK (plan IS NULL OR plan IN ('mensuel', 'annuel'));

CREATE OR REPLACE FUNCTION public.admin_set_org_plan(p_org_id uuid, p_plan text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF get_my_role() <> 'super_admin' THEN
    RAISE EXCEPTION 'Acces reserve au super administrateur';
  END IF;
  IF p_plan IS NOT NULL AND p_plan NOT IN ('mensuel','annuel') THEN
    RAISE EXCEPTION 'Plan invalide: %', p_plan;
  END IF;
  UPDATE organizations SET plan = p_plan WHERE id = p_org_id;
END;
$function$;

-- MRR (HT) = nb médecins × 349 (mensuel) ou × 3490/12 (annuel). 'trial' et 'comp' exclus (status = 'active' seulement).
CREATE OR REPLACE FUNCTION public.admin_billing_summary()
 RETURNS TABLE(mrr numeric, active_count bigint, trial_count bigint, comp_count bigint, suspended_count bigint, overdue_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF get_my_role() <> 'super_admin' THEN
    RAISE EXCEPTION 'Acces reserve au super administrateur';
  END IF;
  RETURN QUERY
  SELECT
    round(COALESCE(SUM(
      (SELECT count(*) FROM doctors d WHERE d.org_id = o.id)
      * CASE o.plan WHEN 'mensuel' THEN 349::numeric WHEN 'annuel' THEN 3490::numeric / 12 ELSE 0 END
    ) FILTER (WHERE o.status = 'active'), 0), 2)::numeric AS mrr,
    count(*) FILTER (WHERE o.status = 'active'),
    count(*) FILTER (WHERE o.status = 'trial'),
    count(*) FILTER (WHERE o.status = 'comp'),
    count(*) FILTER (WHERE o.status = 'suspended'),
    count(*) FILTER (WHERE o.status = 'active' AND o.next_due_date IS NOT NULL AND o.next_due_date < current_date)
  FROM organizations o
  WHERE NOT EXISTS (SELECT 1 FROM user_profiles up WHERE up.org_id = o.id AND up.role = 'super_admin');
END;
$function$;

-- B. Fin d'essai : information seulement, AUCUN blocage automatique.
ALTER TABLE organizations ADD COLUMN trial_ends_at timestamptz;
ALTER TABLE organizations ALTER COLUMN trial_ends_at SET DEFAULT now() + interval '30 days';
UPDATE organizations
   SET trial_ends_at = GREATEST(created_at + interval '30 days', now() + interval '30 days')
 WHERE status = 'trial';

-- Le type de retour change (trial_ends_at) : DROP puis CREATE, droits d'exécution rétablis.
DROP FUNCTION public.admin_list_organizations();
CREATE FUNCTION public.admin_list_organizations()
 RETURNS TABLE(org_id uuid, name text, type text, status text, plan text, created_at timestamp with time zone, suspended_at timestamp with time zone, last_payment_at timestamp with time zone, next_due_date date, doctor_count bigint, patient_count bigint, last_activity timestamp with time zone, is_overdue boolean, trial_ends_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF get_my_role() <> 'super_admin' THEN
    RAISE EXCEPTION 'Acces reserve au super administrateur';
  END IF;
  RETURN QUERY
  SELECT o.id, o.name, o.type, o.status, o.plan, o.created_at, o.suspended_at,
    o.last_payment_at, o.next_due_date,
    (SELECT count(*) FROM doctors d WHERE d.org_id = o.id),
    (SELECT count(*) FROM patients p WHERE p.org_id = o.id),
    (SELECT max(ord.created_at) FROM ordonnances ord WHERE ord.org_id = o.id),
    (o.status = 'active' AND o.next_due_date IS NOT NULL AND o.next_due_date < current_date) AS is_overdue,
    o.trial_ends_at
  FROM organizations o
  WHERE NOT EXISTS (SELECT 1 FROM user_profiles up WHERE up.org_id = o.id AND up.role = 'super_admin')
  ORDER BY o.created_at DESC;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_list_organizations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_organizations() TO authenticated, service_role;

-- Comptes offerts (décision fondateur, 2026-10-25). Le compte démo contact@ordosur.com n'est pas touché.
UPDATE organizations SET status = 'comp', suspended_at = NULL
 WHERE id IN ('1c228efe-bdff-429b-84df-18d5bc361c1c',
              'd20a89bb-1dba-43ca-8dac-f2fed82d70ad',
              'eef6f0da-74cc-4caa-9444-7533eccc65ec');
