import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Download, Users, ChevronLeft, ChevronRight,
  AlertCircle, Filter,
} from 'lucide-react';
import { PageTransition } from '../../../components/ui/PageTransition';
import { supabase } from '../../../lib/supabase';
import type { Patient } from '../../../lib/supabase';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAge(dob: string | null | undefined): string {
  if (!dob) return '—';
  const diff = Date.now() - new Date(dob).getTime();
  return `${Math.floor(diff / (1000 * 60 * 60 * 24 * 365))} ans`;
}

function exportCSV(patients: Patient[]) {
  const header = ['Prénom', 'Nom', 'Date naissance', 'Téléphone', 'Email', 'Pathologies', 'Allergies'];
  const rows = patients.map(p => [
    p.prenom, p.nom,
    p.date_naissance ?? '',
    p.telephone ?? '',
    p.email ?? '',
    (p.pathologies ?? []).join('; '),
    (p.allergies_medicaments ?? []).join('; '),
  ]);
  const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'patients_clinique.csv'; a.click();
  URL.revokeObjectURL(url);
}

// ─── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100 dark:border-white/[0.04]">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 bg-slate-200 dark:bg-white/[0.07] rounded animate-pulse w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

// ─── Badge ─────────────────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${color}`}>
      {label}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props { orgId?: string; }

type FilterType = 'all' | 'allergies' | 'pathologies';

// ─── Component ────────────────────────────────────────────────────────────────

export function ClinicPatientsView({ orgId }: Props) {
  const [patients, setPatients]     = useState<Patient[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(0);
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState<FilterType>('all');
  const [loading, setLoading]       = useState(true);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('patients')
        .select('*', { count: 'exact' })
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (search.trim()) {
        query = query.or(
          `prenom.ilike.%${search}%,nom.ilike.%${search}%`
        );
      }
      if (filter === 'allergies') {
        query = query.not('allergies_medicaments', 'is', null);
      }
      if (filter === 'pathologies') {
        query = query.not('pathologies', 'is', null);
      }

      query = query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      const { data, count, error } = await query;
      if (!error) {
        setPatients(data ?? []);
        setTotal(count ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, search, filter, page]);

  useEffect(() => { setPage(0); }, [search, filter]);
  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all',         label: 'Tous'              },
    { key: 'allergies',   label: 'Avec allergies'    },
    { key: 'pathologies', label: 'Avec pathologies'  },
  ];

  return (
    <PageTransition>
      <div className="p-6 max-w-[1400px]">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-[#E2E8F0]">Patients</h1>
            <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-0.5">
              {total} patient{total !== 1 ? 's' : ''} enregistré{total !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => exportCSV(patients)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-[#94A3B8] bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter CSV
          </button>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un patient…"
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
                  {['Nom complet', 'Âge', 'Téléphone', 'Pathologies', 'Allergies', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 dark:text-[#475569] uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                  : patients.length === 0
                    ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center">
                          <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                          <p className="text-sm text-slate-400 dark:text-slate-600">Aucun patient trouvé</p>
                        </td>
                      </tr>
                    )
                    : patients.map((p, i) => (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-slate-50 dark:border-white/[0.03] hover:bg-slate-50/70 dark:hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 to-cyan-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {p.prenom[0]}{p.nom[0]}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">
                                {p.prenom} {p.nom}
                              </p>
                              {p.sexe && (
                                <p className="text-xs text-slate-400 dark:text-[#475569]">
                                  {p.sexe === 'M' ? 'Homme' : 'Femme'}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600 dark:text-[#94A3B8]">
                          {getAge(p.date_naissance)}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600 dark:text-[#94A3B8]">
                          {p.telephone || '—'}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1">
                            {(p.pathologies ?? []).slice(0, 2).map(path => (
                              <Badge key={path} label={path} color="bg-violet-50 dark:bg-violet-500/[0.1] text-violet-700 dark:text-violet-400" />
                            ))}
                            {(p.pathologies ?? []).length > 2 && (
                              <Badge label={`+${(p.pathologies ?? []).length - 2}`} color="bg-slate-100 dark:bg-white/[0.07] text-slate-500 dark:text-slate-400" />
                            )}
                            {!(p.pathologies?.length) && <span className="text-xs text-slate-300 dark:text-slate-700">—</span>}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1">
                            {(p.allergies_medicaments ?? []).slice(0, 1).map(a => (
                              <Badge key={a} label={a} color="bg-red-50 dark:bg-red-500/[0.1] text-red-600 dark:text-red-400" />
                            ))}
                            {(p.allergies_medicaments ?? []).length > 1 && (
                              <div className="flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                                <span className="text-xs text-red-500">+{(p.allergies_medicaments ?? []).length - 1}</span>
                              </div>
                            )}
                            {!(p.allergies_medicaments?.length) && <span className="text-xs text-slate-300 dark:text-slate-700">—</span>}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <button className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors">
                            Voir fiche
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
                Page {page + 1} / {totalPages} — {total} patients
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-[#94A3B8]" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-colors"
                >
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
