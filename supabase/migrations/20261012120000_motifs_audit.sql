-- Sprint 4e-B (correctif) — Audit exhaustif des motifs : compléments.
-- Les fichiers de référence (20261002… et 20261011…) sont régénérés par les scripts et
-- contiennent déjà ces motifs ; cette migration les ajoute aux bases déjà migrées.
--
-- Vrais faux négatifs trouvés par l'audit (spécialités 🇲🇦 commercialisées non reconnues) :
--   • CARDIOFLEX 100 MG : DCI « acide acétilsalicylique » (orthographe fautive) → aspirine ;
--   • CO-ANGINIB : « hydrochlorthiazide » (sic) ; DIUREX : xipamide ;
--   • ALPHA-KADOL : phénylbutazone (AINS) ; PANSORAL : salicylate de choline ;
--     RINOMICINE : salicylamide ; sulfasalazine (sulfamide) ;
--   • canal antécédents : bémiparine, fondaparinux, tirofiban, dipyridamole.
-- + radicaux robustes aux formes inversées (« TIAPROFÉNIQUE (ACIDE) »).

insert into public.allergie_familles (famille, label, type, motif) values
  ('sulfamides_antibacteriens', 'sulfamides antibactériens', 'molecule', 'sulfasalazin'),
  ('diuretiques_sulfamides', 'diurétiques sulfamidés', 'molecule', 'torsemid'),
  ('diuretiques_sulfamides', 'diurétiques sulfamidés', 'molecule', 'hydrochlorthiazid'),
  ('diuretiques_sulfamides', 'diurétiques sulfamidés', 'molecule', 'xipamid'),
  ('diuretiques_sulfamides', 'diurétiques sulfamidés', 'molecule', 'altizid'),
  ('diuretiques_sulfamides', 'diurétiques sulfamidés', 'molecule', 'clopamid'),
  ('ains', 'AINS', 'molecule', 'tiaprofeni'),
  ('ains', 'AINS', 'molecule', 'niflumi'),
  ('ains', 'AINS', 'molecule', 'mefenami'),
  ('ains', 'AINS', 'molecule', 'phenylbutazon'),
  ('aspirine', 'aspirine', 'molecule', 'acetilsalicyl'),
  ('aspirine', 'aspirine', 'molecule', 'salicylamid'),
  ('aspirine', 'aspirine', 'molecule', 'salicylate de choline'),
  ('aspirine', 'aspirine', 'molecule', 'choline salicylate'),
  ('quinolones', 'quinolones', 'molecule', 'nalidixi'),
  ('quinolones', 'quinolones', 'molecule', 'pipemidi')
on conflict (famille, type, motif) do nothing;

insert into public.regles_antecedents_classes (classe, dci_motif) values
  ('ains', 'tiaprofeni'),
  ('ains', 'niflumi'),
  ('ains', 'mefenami'),
  ('ains', 'phenylbutazone'),
  ('aspirine', 'acetilsalicyl'),
  ('antiagregant', 'tirofiban'),
  ('antiagregant', 'dipyridamole'),
  ('anticoagulant', 'bemiparine'),
  ('anticoagulant', 'fondaparinux')
on conflict (classe, dci_motif) do nothing;
