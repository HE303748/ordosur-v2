import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Send, Search } from 'lucide-react';
import type { Patient } from '../../lib/supabase';
import { useDataSync } from '../../lib/dataSync';
import { loadOrgLettres, type LettreAdressage } from '../../lib/adressageApi';
import { LettreCard } from './AdressagesSection';

/**
 * Sprint 7 — Lettres d'adressage du cabinet, en LECTURE SEULE (secrétaire) : consulter et
 * réimprimer à l'identique. Aucune action de suivi ni de modification n'est proposée ici.
 */
export function AdressagesListView({ patients }: { patients: Patient[] }) {
  const [lettres, setLettres] = useState<LettreAdressage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const seq = useRef(0);

  const load = useCallback(async () => {
    const s = ++seq.current;
    try {
      const rows = await loadOrgLettres(60);
      if (s === seq.current) { setLettres(rows); setError(null); }
    } catch (e) {
      console.error('[adressages] lettres du cabinet :', e);
      if (s === seq.current) setError('Lettres d’adressage indisponibles');
    } finally {
      if (s === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useDataSync(['adressages'], () => { void load(); });

  const byId = useMemo(() => new Map(patients.map(p => [p.id, p])), [patients]);
  const q = search.trim().toLowerCase();
  const visibles = lettres.filter(l => !q || `${l.patient_ligne} ${l.destinataire_ligne} ${l.motif}`.toLowerCase().includes(q));

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Adressages</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Lettres adressées aux confrères — consultation et réimpression</p>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un patient, un confrère, un motif…" aria-label="Rechercher une lettre"
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50" />
      </div>

      {error && (
        <div role="alert" className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => void load()} className="font-semibold underline underline-offset-2">Réessayer</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-white/[0.06] animate-pulse" />)}</div>
      ) : visibles.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Send className="w-12 h-12 mb-3 opacity-30" aria-hidden />
          <p className="text-sm">{q ? 'Aucune lettre ne correspond' : 'Aucune lettre d’adressage'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibles.map(l => (
            <LettreCard key={l.id} lettre={l} patient={byId.get(l.patient_id) ?? null} canWrite={false} patientLabel={l.patient_ligne.split(' — ')[0]} collapsed />
          ))}
        </div>
      )}
    </div>
  );
}
