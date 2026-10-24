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
7. **Ne jamais relier une spécialité à un contre-ion seul (sodium, potassium, calcium, magnésium, lysine) quand la DCI
   désigne un sel d'une autre molécule** (« SODIUM (VALPROATE DE) », « FOLINATE DE CALCIUM »…). Une ligne sans
   ingrédient est un signal honnête (« non vérifiable ») ; une ligne mal reliée est un faux vert.

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
- Sprint 2d — clic sûr, corticoïdes, libellés :
  · Aucun bandeau en flux au-dessus de la recherche de médicaments : les bandeaux du brouillon sont en SUPERPOSITION
    (flottants, en bas). Tout nouveau bandeau asynchrone suit la même règle (ou réserve sa hauteur dès le premier rendu).
    Garde-fou `lib/stableSearch` (`createPositionGuard`, `decideClick`) : un clic dans la liste n'est accepté que si elle
    est immobile depuis 300 ms, sinon la ligne est surlignée. Après un ajout : « Ajouté : libellé exact » + Annuler 5 s.
    Un brouillon n'est proposé qu'une fois par visite (`ordonnanceDraft.draftOfferDecision`).
  · Sprint 2e — le garde-fou ne compte que les mouvements RÉELS de la liste (≥ 2 px ou contenu changé, mesurés
    depuis le dernier état stable : `sameListPlace`). Après CHAQUE clic dans la liste elle se ferme et le champ se vide ;
    liste qui a bougé ou doublon (même fiche / même libellé, `findDuplicate`, `pickOutcome`) → question dans la ligne
    d'état à hauteur fixe. Pendant la saisie la vue ne raccourcit pas (`reservedMinHeight`) ; compensation de défilement
    seulement si la carte patient est au-dessus du champ (`cardCompensation`). Focus rendu au champ de façon SYNCHRONE
    avant tout retrait (✕, Annuler) ; Échap / clic extérieur ferment la liste (`data-esc-own`).
  · Canal antécédents : classe `corticoide` (voie GÉNÉRALE uniquement — colonne `regles_antecedents_classes.voie`, formes
    locales écartées par `antecedentEngine.isLocalForm`), règles C1 / C1b / C2, JAMAIS de CI absolue. AINS + corticoïde :
    mention sur les deux cartes (`ASSOCIATIONS_DIGESTIVES`). Empreintes base = source dans `regles_antecedents.data.json`.
  · Libellés : carte rétrogradée → « Contre-indication absolue SI … » (`safetyGuards.descriptionConditionnelle`) ; texte
    ANSM dont le niveau est inséré au milieu de la phrase (import du thésaurus à deux colonnes) recousu à l'affichage
    (`lib/interactionText.ts`, la base n'est pas modifiée). Limite connue : conduites à tenir de plusieurs lignes encore
    entremêlées (réimport du thésaurus à prévoir).
- Lettre d'adressage (Sprint 7) : `confreres` (carnet du médecin, archivage) et `lettres_adressage` (texte, destinataire,
  ligne patient, en-tête et annexe des bilans FIGÉS par trigger à l'enregistrement → réimpression à l'identique, y compris
  par la secrétaire ; seul le suivi évolue : brouillon → envoyee → reponse_recue, annulation motivée ; pour modifier : dupliquer).
  Texte généré par un modèle DÉTERMINISTE, sans IA : `src/lib/lettreAdressage.ts` (génération + classes thérapeutiques lues
  dans `regles_doublons` / `regles_allergies` / `regles_renales`, chargé avec la modale) et `src/lib/lettreTexte.ts` (accords,
  destinataire, texte riche « paragraphes + **gras** », suivi, brouillon — léger). Règle d'or : aucune donnée inventée, une
  section sans donnée est omise ; un traitement n'est dit « antihypertenseur » que si le patient est hypertendu. Ces modules
  ne lisent ni n'alimentent le moteur de sécurité. PDF : `src/lib/lettrePdf.ts`.
- Mapping médicament → ingrédients (Sprint BDD-0) : les interactions (`check_interactions_v2(p_med_ids)`) passent
  UNIQUEMENT par `medicament_ingredients` ; les CI, le canal rénal et le canal tératogène lisent le TEXTE (DCI, nom,
  `dci_canonique`) — corriger un lien sans corriger une DCI fausse ne suffit donc pas. Correctifs ponctuels : source unique
  `scripts/gen_bdd0_mapping_fixes.mjs` (migration gardée par l'état de départ + empreinte base = source). Rapports de
  revue hors dépôt : `../sprint2b/revue/bdd0_incoherences.csv`, `bdd0_jumeaux.csv`.
- Référentiel de substances unique (Sprint BDD-1) : `ingredients.canonical_id` relie les entités d'une même molécule
  (jumeaux FR/EN — metformin/metformine, valproic acid/valproate… —, DCI/USAN, sel, hydrate, promédicament) à UN canonique,
  qui pointe vers lui-même (NULL = hors groupe ; trigger `ingredients_canonical_guard` : jamais de chaîne). Rien n'est
  fusionné ni supprimé : `check_interactions_v2` élargit chaque ingrédient à tout son groupe (ANSM, DDInter, cumul),
  compare les CANONIQUES (jamais les ids bruts : deux jumeaux ne s'opposent pas), rend UNE carte DDInter par paire de
  substances (la plus sévère) et conserve une carte DDInter strictement plus sévère que la carte ANSM de la paire.
  **Toute nouvelle substance ajoutée à `ingredients` doit être rattachée à son canonique** (nouvelle migration générée
  depuis `scripts/gen_bdd1_equivalences.mjs`, empreinte base = source). Jamais dans un même groupe : énantiomères
  (ésoméprazole/oméprazole…), HBPM/héparine, anticorps nu/conjugué, associations, fiches « topical / nasal / ophthalmic »,
  identifiants `ddinterNNNN` (liste `INTERDITS` testée). `interactions_ingredients.revue_requise` = ligne rédigée à la
  main, à relire : comparée sur les liens DIRECTS, jamais propagée au groupe. Candidats non appliqués et lignes à relire
  hors dépôt : `../sprint2b/revue/bdd1_groupes.csv`, `bdd1_ddinter_manuelles.csv`.
  BDD-1b : 15 contre-indications DDInter du gabarit « A × B — Contre-indication : association déconseillée » qui
  atteignaient de nouvelles paires MA via le groupe (amoxicilline × ésoméprazole magnésium, rifampicine × IPP /
  clopidogrel…) passées en revue_requise (68 lignes) ; liste explicite `scripts/gen_bdd1b_revue_ci.mjs`.
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
