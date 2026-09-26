-- Préférence médecin : afficher l'identité du patient sur le PDF d'ordonnance.
-- Désactivée par défaut. Ajout de colonne seul (DEFAULT constant → pas de réécriture de table).
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS show_patient_name_on_pdf boolean NOT NULL DEFAULT false;
