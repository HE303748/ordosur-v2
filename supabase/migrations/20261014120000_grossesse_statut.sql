-- Sprint 4e-C — Statut grossesse / allaitement de la patiente.
-- Lu par src/lib/pregnancyStatus.ts, qui requalifie après coup les CI « grossesse /
-- allaitement » déjà détectées. La table contraindications et son matching ne changent pas.

-- 1. Statut déclaré par le médecin. Tout est nullable : absent = inconnu (comportement d'origine).
alter table public.patients
  add column if not exists grossesse_statut text
    check (grossesse_statut is null or grossesse_statut in ('enceinte','non_enceinte','inconnu')),
  add column if not exists grossesse_ddr date,
  add column if not exists allaitement boolean,
  add column if not exists grossesse_maj_le timestamptz;

comment on column public.patients.grossesse_statut is 'enceinte | non_enceinte | inconnu (null = inconnu)';
comment on column public.patients.grossesse_ddr is 'Date des dernières règles (un terme saisi en SA est converti en DDR)';
comment on column public.patients.allaitement is 'true = allaite, false = n''allaite pas, null = inconnu';
comment on column public.patients.grossesse_maj_le is 'Date de la dernière déclaration du statut grossesse / allaitement';

-- 2. Tératogènes majeurs : leur CI grossesse reste conditionnelle même si la patiente est
--    déclarée non enceinte. Motifs normalisés (minuscules, sans accents), en début de mot.
create table if not exists public.teratogenes_majeurs (
  id uuid primary key default gen_random_uuid(),
  substance text not null,
  motif text not null unique check (length(motif) >= 3 and motif = lower(motif)),
  source text not null default 'Proposition Ordosur d''après RCP — à valider'
);

alter table public.teratogenes_majeurs enable row level security;
drop policy if exists teratogenes_majeurs_read on public.teratogenes_majeurs;
create policy teratogenes_majeurs_read on public.teratogenes_majeurs for select to authenticated using (true);
revoke insert, update, delete on public.teratogenes_majeurs from anon, authenticated;

insert into public.teratogenes_majeurs (substance, motif) values
  ('valproate', 'valpro'),
  ('valproate', 'divalpro'),
  ('valproate', 'depakin'),
  ('valproate', 'micropakin'),
  ('valproate', 'valpakin'),
  ('valproate', 'depakot'),
  ('valproate', 'divalcot'),
  ('valproate', 'depamid'),
  ('isotrétinoïne', 'isotretinoin'),
  ('isotrétinoïne', 'roaccutan'),
  ('isotrétinoïne', 'curacne'),
  ('isotrétinoïne', 'contracne'),
  ('isotrétinoïne', 'procuta'),
  ('acitrétine', 'acitretin'),
  ('acitrétine', 'soriatan'),
  ('acitrétine', 'neotigason'),
  ('méthotrexate', 'methotrexat'),
  ('méthotrexate', 'novatrex'),
  ('méthotrexate', 'imeth'),
  ('méthotrexate', 'metoject'),
  ('méthotrexate', 'ledertrexat'),
  ('méthotrexate', 'nordimet'),
  ('mycophénolate', 'mycophenol'),
  ('mycophénolate', 'cellcept'),
  ('mycophénolate', 'myfortic'),
  ('mycophénolate', 'myfenax'),
  ('thalidomide', 'thalidomid'),
  ('AVK', 'acenocoumarol'),
  ('AVK', 'sintrom'),
  ('AVK', 'warfarin'),
  ('AVK', 'coumadin'),
  ('AVK', 'fluindion'),
  ('AVK', 'previscan')
on conflict (motif) do nothing;
