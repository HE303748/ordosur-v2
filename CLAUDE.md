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
  pathologies 48 041 · pathologies_curees 372 · contraindications 1 467 · ci_condition_concepts 245 · allergies_reference 71.
- Bilans (Sprint 6A) : `resultats_examens` (valeurs figées ; correction = archivage avec motif + nouvelle ligne ;
  interprétation calculée en base UNIQUEMENT d'après les bornes du labo saisies ; RPC `enregistrer_resultats_examens`).
  Règles pures : `src/lib/resultatsLogic.ts`. Conversions d'unités : uniquement `examens_reference.unites`.
- Fonction rénale (Sprint 6B) : canal additionnel `src/lib/renalEngine.ts` (CKD-EPI 2021, Cockcroft si `patients.poids_kg`),
  règles en base `regles_renales` / `regles_renales_classes` (générées par `scripts/gen_regles_renales.mjs`), créatinine
  relue en base avant chaque verdict (`hooks/useRenal.ts`, jamais le cache de vue).
- Matching des conditions (Sprint 2b-1) : module pur `src/lib/conditionMatcher.ts`. Le concept d'une CI est LU dans la table
  `ci_condition_concepts` (formulation → concept de pathologies_curees, qualificatif, stade, famille), générée et relue à la main
  dans `scripts/gen_ci_condition_concepts.mjs` — jamais cherché dans le texte. Toute NOUVELLE formulation de
  `contraindications.condition_valeur` doit y être ajoutée (sinon : libellé identique seulement). Plus aucun préfixe ni sous-chaîne.
  Banc de non-régression hors dépôt : `../sprint2b/banc.mjs --reel` (toute disparition non validée = STOP) ; écart entre deux
  passes : `../sprint2b/compare.mjs`.
  Sprint 2b-2 : une pathologie listée est ACTIVE (« actif / évolutif » satisfait, sévérité conservée) ; famille « infection »
  (CI génériques « Infection ») ; CI « Dialyse » = patient dialysé (pathologie / antécédent) ou DFG < 15 ; écritures courantes
  hors référentiel dans `NOMS_COMPLEMENTAIRES` (« Cirrhose », « Hypotension orthostatique »).
- Sprint 2c — fiabilité de la saisie :
  · Listes de recherche (`lib/stableSearch.ts`) : l'élément ajouté est celui dont l'élément cliqué porte l'identifiant
    (`data-*` + `pickById`), jamais un index ; une liste n'est relancée que si la FRAPPE a changé (`needsSearch`).
    À respecter dans toute nouvelle recherche.
  · Verdict : la clé d'analyse contient `patientEngineSignature` (pathologies, allergies, réactions, sexe, date de naissance,
    grossesse, poids). Tout écran qui écrit `patients` appelle `notifyDataChanged('patient')` : le Vérificateur relit la fiche.
  · Pathologies : recherche locale normalisée (`lib/pathologySearch.ts`, même normalisation que le moteur, « type I » = « type 1 ») ;
    libellé libre non relié à un concept → badge « Non reconnu par le moteur » + suggestion en 1 clic. Aucune donnée existante modifiée.
  · Infections bénignes (`FAMILLES.infection.benignes`) : CI génériques « Infection » en « À évaluer ».
  · IRC déclarée + DFG calculé ≥ 60 : ligne d'information (`incoherenceIrcDfg`).
- Deux DFG (Sprint 2b-2) : DFG labo (examen `DFG` des bilans) et DFG calculé (CKD-EPI). Le moteur utilise la donnée la plus
  récente : la créatinine si son prélèvement est strictement plus récent, sinon le DFG labo — jamais de repli. Les deux sont affichés
  avec source et date (`renalEngine.dfgDoubleLine`).
- Sévérité non documentée (`non_classee`, Sprint 2b-2) : information — ne bloque plus le vert ; section repliable ; le titre vert
  devient « Aucune interaction cliniquement significative connue » (`safetyGuards.titleForDisplay`).
- Courbes (Sprint 2b-2) : tous les points convertis dans UNE unité (défaut = unité de référence, `uniteCourbeDefaut`) ; axe jamais
  sous 0 (`axeDomaine`) ; un résultat non convertible n'est pas tracé, il est compté.
- RPC : `search_medicaments(search_term, limit_count)` (expose dci_canonique, tri Maroc d'abord) ·
  `check_drug_interactions_for_meds(p_med_strings text[])` · `drug_name_normalize(p_text)`.
- Moteur CI : client-side dans DoctorDashboard.tsx (`runCheck`, `loadInteractionDb` via fetchAllRows).
  Matching médicament : pattern ⊆ norm(dci + nom + dci_canonique). Matching condition :
  `conditionMatcher.ts` (concepts, familles, stades rénaux, qualificatifs → « À évaluer » ou sévérité conservée « à préciser »).

## Workflow
- 1 sprint = 1 session Claude Code = 1 push. Fermer la session après le push.
- Structure d'un sprint : Diagnostic (lecture seule) → Rapport → Correction → Validation → Commit.
- Exemples/tests : toujours des médicaments marocains (Brufen, Kardegic, Aspégic, Glucophage,
  Migergot, Depakine, Sintrom...).
- Rappel au fondateur : attendre Vercel READY + hard refresh Ctrl+Shift+R avant de tester.
