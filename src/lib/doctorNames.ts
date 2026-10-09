import { supabase } from './supabase';

// Sprint P — Nom et spécialité des médecins : affichage seul (jamais lu par le moteur),
// stables pendant la session. Mémorisés pour éviter deux allers-retours en série
// (doctors → user_profiles) à chaque ouverture d'un profil patient.

export interface DoctorInfo { name: string; specialty: string }

const known = new Map<string, DoctorInfo>();
let pending: Promise<void> | null = null;

/** Vide la mémoire (déconnexion). */
export function clearDoctorInfos(): void {
  known.clear();
  pending = null;
}

/** Infos des médecins demandés ; seuls les identifiants encore inconnus sont interrogés. */
export async function resolveDoctorInfos(doctorIds: string[]): Promise<Map<string, DoctorInfo>> {
  const ids = [...new Set(doctorIds.filter(Boolean))];
  if (pending) await pending.catch(() => {});
  const missing = ids.filter(id => !known.has(id));
  if (missing.length > 0) {
    pending = (async () => {
      const { data: docs } = await supabase.from('doctors').select('id, user_id, specialite').in('id', missing);
      const rows = (docs as Array<{ id: string; user_id: string; specialite: string | null }> | null) ?? [];
      if (rows.length === 0) return;
      const { data: profiles } = await supabase.from('user_profiles')
        .select('user_id, prenom, nom').in('user_id', rows.map(r => r.user_id).filter(Boolean));
      const byUser = new Map(((profiles as Array<{ user_id: string; prenom: string | null; nom: string | null }> | null) ?? []).map(p => [p.user_id, p]));
      for (const r of rows) {
        const p = byUser.get(r.user_id);
        // Profil illisible (RLS) : rien n'est mémorisé, le prochain appel réessaiera.
        if (p) known.set(r.id, { name: `Dr. ${p.prenom ?? ''} ${p.nom ?? ''}`.replace(/\s+/g, ' ').trim(), specialty: r.specialite || '' });
      }
    })();
    try { await pending; } finally { pending = null; }
  }
  const out = new Map<string, DoctorInfo>();
  for (const id of ids) { const v = known.get(id); if (v) out.set(id, v); }
  return out;
}
