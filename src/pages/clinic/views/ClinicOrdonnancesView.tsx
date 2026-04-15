import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search, FileText, ChevronLeft, ChevronRight, Filter,
} from 'lucide-react';
import { PageTransition } from '../../../components/ui/PageTransition';
import { supabase } from '../../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrdonnanceRow {
  id: string;
  date: string;
  statut: string | null;
  created_at: string;
  patient_id: string;
  doctor_id: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

type FilterType = 'all' | 'active' | 'expired';

function StatusBadge({ statut }: { statut: string | null }) {
  if (statut === 'active') return (
    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
      Active
    </span>
  );
  if (statut === 'expired') return (
    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400">
      Expirée
    </span>
  );
  return (
    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-white/[0.07] text-slate-500 dark:text-slate-400">
      —
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-50 dark:border-white/[0.03]">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 bg-slate-200 dark:bg-white/[0.07] rounded animate-pulse max-w-[100px]" />
        </td>
      ))}
    </tr>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props { orgId?: string; }

export function ClinicOrdonnancesView({ orgId }: Props) {
  const [ordonnances, setOrdonnances] = useState<OrdonnanceRow[]>([]);
  const [patientNames, setPatientNames] = useState<Map<string, string>>(new Map());
  const [doctorNames, setDoctorNames]   = useState<Map<string, string>>(new Map());
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('ordonnances')
        .select('id, date, statut, created_at, patient_id, doctor_id', { count: 'exact' })
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (filter === 'active')  query = query.eq('statut', 'active');
      if (filter === 'expired') query = query.eq('statut', 'expired');

      query = query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      const { data, count, error } = await query;
      if (error || !data) { setLoading(false); return; }

      setOrdonnances(data);
      setTotal(count ?? 0);

      // Load patient names
      const patIds = [...new Set(data.map(o => o.patient_id).filter(Boolean))];
      if (patIds.length) {
        const { data: pats } = await supabase
          .from('patients').select('id, prenom, nom').in('id', patIds);
        const m = new Map<string, string>();
        (pats ?? []).forEach(p => m.set(p.id, `${p.prenom} ${p.nom}`));
        setPatientNames(m);
      }

      // Load doctor names (via doctors → user_profiles)
      const docIds = [...new Set(data.map(o => o.doctor_id).filter(Boolean))];
      if (docIds.length) {
        const { data: docs } = await supabase
          .from('doctors').select('id, user_id').in('id', docIds);
        const userIds = (docs ?? []).map(d => d.user_id).filter(Boolean);
        if (userIds.length) {
          const { data: profs } = await supabase
            .from('user_profiles').select('user_id, prenom, nom').in('user_id', userIds);
          const profMap = new Map<string, string>();
          (profs ?? []).forEach(p => profMap.set(p.user_id, `Dr. ${p.prenom} ${p.nom}`));
          const m = new Map<string, string>();
          (docs ?? []).forEach(d => {
            const name = profMap.get(d.user_id) ?? 'Médecin';
            m.set(d.id, name);
          });
          setDoctorNames(m);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, filter, page]);

  useEffect(() => { setPage(0); }, [filter]);
  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Stats
  const activeCount  = ordonnances.filter(o => o.statut === 'active').length;
  const expiredCount = ordonnances.filter(o => o.statut === 'expired').length;
  const thisMonth    = ordonnances.filter(o => {
    const d = new Date(o.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all',     label: 'Toutes'  },
    { key: 'active',  label: 'Actives' },
    { key: 'expired', label: 'Expirées'},
  ];

  return (
    <PageTransition>
      <div className="p-6 max-w-[1400px]">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#E2E8F0]">Ordonnances</h1>
          <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-0.5">
            {total} ordonnance{total !== 1 ? 's' : ''} au total
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Actives',  value: activeCount,  color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Expirées', value: expiredCount, color: 'text-red-500 dark:text-red-400'         },
            { label: 'Ce mois',  value: thisMonth,    color: 'text-sky-600 dark:text-sky-400'          },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-xl px-5 py-3 flex items-center gap-3">
              <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
              <span className="text-sm text-slate-500 dark:text-[#94A3B8]">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] rounded-xl text-sm text-slate-900 dark:text-[#E2E8F0] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-500/40"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400 mr-1" />
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-sky-500 text-white'
                    : 'bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-[#94A3B8] hover:border-sky-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]">
                  {['N°', 'Date', 'Patient', 'Médecin', 'Statut', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 dark:text-[#475569] uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                  : ordonnances.length === 0
                    ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center">
                          <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                          <p className="text-sm text-slate-400 dark:text-slate-600">Aucune ordonnance</p>
                        </td>
                      </tr>
                    )
                    : ordonnances
                        .filter(o => {
                          if (!search.trim()) return true;
                          const s = search.toLowerCase();
                          return (patientNames.get(o.patient_id) ?? '').toLowerCase().includes(s)
                            || shortId(o.id).includes(s.toUpperCase());
                        })
                        .map((o, i) => (
                          <motion.tr
                            key={o.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.03 }}
                            className="border-b border-slate-50 dark:border-white/[0.03] hover:bg-slate-50/70 dark:hover:bg-white/[0.03] transition-colors"
                          >
                            <td className="px-5 py-4">
                              <span className="text-xs font-mono font-bold text-slate-500 dark:text-[#475569] bg-slate-100 dark:bg-white/[0.07] px-2 py-1 rounded">
                                #{shortId(o.id)}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-700 dark:text-[#94A3B8]">
                              {formatDate(o.date || o.created_at)}
                            </td>
                            <td className="px-5 py-4 text-sm font-medium text-slate-900 dark:text-[#E2E8F0]">
                              {patientNames.get(o.patient_id) ?? '—'}
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-600 dark:text-[#94A3B8]">
                              {doctorNames.get(o.doctor_id) ?? '—'}
                            </td>
                            <td className="px-5 py-4">
                              <StatusBadge statut={o.statut} />
                            </td>
                            <td className="px-5 py-4">
                              <button className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 transition-colors">
                                Voir
                              </button>
                            </td>
                          </motion.tr>
                        ))
                }
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 dark:border-white/[0.06]">
              <p className="text-xs text-slate-400 dark:text-[#475569]">
                Page {page + 1} / {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="p-1.5 rounded-lg disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-colors">
                  <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-[#94A3B8]" />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-colors">
                  <ChevronRight className="w-4 h-4 text-slate-600 dark:text-[#94A3B8]" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
