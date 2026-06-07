# CLAUDE.md — Contexte permanent Ordosur

## Produit
SaaS médical pour médecins marocains francophones (ordosur.com). UI 100% français.
Cœur du produit : vérificateur d'interactions médicamenteuses et contre-indications
(moteur de sécurité MÉDICAL — toute modification exige diagnostic lecture seule AVANT fix).

## Stack & déploiement
- React/TypeScript + Vite + Tailwind. Supabase (auth, DB Postgres, RLS, Edge Functions). Resend (emails).
- Déploiement : push sur `main` → auto-deploy Vercel sur ordosur.com. Toujours `npm run build` avant commit.
- ⚠️ Vite NE type-check PAS au build : une variable hors scope passe le build et crashe en prod.
  Vérifier soigneusement les scopes (composant racine vs sous-composants). `npm run typecheck` existe
  (erreurs pré-existantes connues : MandatoryPasswordResetPage, RegisterPage, SecretaireDashboard).

## Règles critiques (à ne JAMAIS violer)
1. **doctor_id = id de la ligne `doctors`** du médecin connecté (PAS `auth.uid()`) pour tout INSERT
   (consultations, ordonnances...). Sinon la RLS refuse. Suivre le pattern existant des ordonnances.
2. **Tout chargement complet d'une table de référence passe par `src/lib/fetchAllRows.ts`**
   (Supabase tronque silencieusement à 1000 lignes — ce bug a rendu 30% du moteur de sécurité aveugle).
   Jamais de `.select('*')` sans pagination sur une table qui peut dépasser 1000 lignes.
3. **`drug_interactions` (163k lignes) : JAMAIS chargée côté client.** Uniquement via la RPC
   `check_drug_interactions_for_meds`. Idem `medicaments` (52k) et `pathologies` (48k) : recherche
   server-side limitée uniquement.
4. **Requêtes SQL légères uniquement** (jamais de cross-join massif — a déjà fait tomber l'instance,
   qui est de petite taille). Vérifier la structure réelle en base avant de coder.
5. **Compte démo `contact@ordosur.com` (Dr. Karim El Amrani) : NE JAMAIS supprimer/vider ses données.**
6. ErrorBoundary en place (global + par vue, `resetKey`) : ne pas retirer.

## Design (tokens officiels : src/lib/design-tokens.ts)
Ink Navy #0A1628 · Medical Green #00A86B (SEUL accent) · Paper #FAFAF7 ·
Alert Red #DC2626 (danger uniquement) · typo Inter. Qualité premium exigée,
responsive mobile irréprochable (objectif : meilleure app médicale mobile du Maroc).

## Base de données (Supabase yxzvukryngvlzjgaydqj)
- Tables clés : medicaments 52 802 (colonne `dci_canonique`) · drug_interactions 163 124 ·
  pathologies 48 041 · pathologies_curees 372 · contraindications 1 421 · allergies_reference 71.
- RPC : `search_medicaments(search_term, limit_count)` (expose dci_canonique, tri Maroc d'abord) ·
  `check_drug_interactions_for_meds(p_med_strings text[])` · `drug_name_normalize(p_text)`.
- Moteur CI : client-side dans DoctorDashboard.tsx (`runCheck`, `loadInteractionDb` via fetchAllRows).
  Matching médicament : pattern ⊆ norm(dci + nom + dci_canonique). Matching condition :
  pathologies + synonymes avec triple garde-fou anti faux-positifs.

## Workflow
- 1 sprint = 1 session Claude Code = 1 push. Fermer la session après le push.
- Structure d'un sprint : Diagnostic (lecture seule) → Rapport → Correction → Validation → Commit.
- Exemples/tests : toujours des médicaments marocains (Brufen, Kardegic, Aspégic, Glucophage,
  Migergot, Depakine, Sintrom...).
- Rappel au fondateur : attendre Vercel READY + hard refresh Ctrl+Shift+R avant de tester.
