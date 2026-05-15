import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Download, Users, ChevronLeft, ChevronRight,
  AlertCircle, Filter, X, FileText, Phone, Mail,
  ChevronUp, ChevronDown, ChevronsUpDown, Droplets,
  Activity, UserCheck, Calendar, ShieldAlert,
} from 'lucide-react';
import { PageTransition } from '../../../components/ui/PageTransition';
import { supabase } from '../../../lib/supabase';
import type { Patient } from '../../../lib/supabase';
import type { DoctorWithProfile } from './ClinicMedecinsView';
import { calculateRiskScore } from '../../../lib/riskScore';

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'allergies' | 'pathologies' | 'recent';
type SortKey    = 'nom' | 'age' | 'last_visit' | null;
type SortDir    = 'asc' | 'desc';

interface PatientMeta {
  doctorName: string;
  lastVisit:  string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

function relativeDate(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7)   return `Il y a ${days} jours`;
  if (days < 30)  return `Il y a ${Math.floor(days / 7)} sem.`;
  if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`;
  return `Il y a ${Math.floor(days / 365)} an${Math.floor(days / 365) > 1 ? 's' : ''}`;
}

function buildCSV(patients: Patient[], metaMap: Map<string, PatientMeta>): string {
  const COLS = ['Prénom','Nom','Date naissance','Âge','Téléphone','Email',
    'Groupe sanguin','Pathologies','Allergies méd.','Allergies alim.',
    'Antécédents chirurgicaux','Traitements en cours','Médecin référent','Dernière visite'];
  const rows = patients.map(p => {
    const age  = getAge(p.date_naissance);
    const meta = metaMap.get(p.id) ?? { doctorName: '—', lastVisit: null };
    return [
      p.prenom, p.nom, p.date_naissance ?? '',
      age !== null ? `${age} ans` : '',
      p.telephone ?? '', p.email ?? '', p.groupe_sanguin ?? '',
      (p.pathologies ?? []).join('; '),
      (p.allergies_medicaments ?? []).join('; '),
      (p.allergies_alimentaires ?? []).join('; '),
      p.antecedents_chirurgicaux ?? '',
      p.traitements_en_cours ?? '',
      meta.doctorName,
      meta.lastVisit ? new Date(meta.lastVisit).toLocaleDateString('fr-FR') : '—',
    ];
  });
  return [COLS, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${color}`}>
      {label}
    </span>
  );
}

// ─── Sort button ──────────────────────────────────────────────────────────────

function SortBtn({ col, active, dir, onClick }: {
  col: SortKey; active: boolean; dir: SortDir; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="ml-1 inline-flex text-inherit opacity-60 hover:opacity-100 transition-opacity">
      {active
        ? dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        : <ChevronsUpDown className="w-3 h-3" />}
    </button>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100 dark:border-white/[0.04]">
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-4 bg-slate-200 dark:bg-white/[0.07] rounded animate-pulse w-full max-w-[100px]" />
        </td>
      ))}
    </tr>
  );
}

// ─── Patient Detail Modal ─────────────────────────────────────────────────────

interface PatientDetailModalProps {
  patient:  Patient;
  meta:     PatientMeta;
  onClose:  () => void;
}

function PatientDetailModal({ patient, meta, onClose }: PatientDetailModalProps) {
  const [ordonnances, setOrdonnances] = useState<Array<{
    id: string; date: string; created_at: string; statut: string | null;
  }>>([]);
  const [ordsLoading, setOrdsLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('ordonnances')
      .select('id, date, created_at, statut')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => { setOrdonnances(data ?? []); setOrdsLoading(false); });
  }, [patient.id]);

  const age = getAge(patient.date_naissance);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full max-w-md h-full bg-white dark:bg-[#111827] border-l border-slate-200 dark:border-white/[0.08] shadow-2xl overflow-y-auto flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/[0.06] flex-shrink-0 sticky top-0 bg-white dark:bg-[#111827] z-10">
          <h2 className="text-base font-bold text-slate-900 dark:text-[#E2E8F0]">Fiche patient</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Identity */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-white/[0.06]">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br bg-[#00A86B] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                {patient.prenom[0]}{patient.nom[0]}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-[#E2E8F0]">
                  {patient.prenom} {patient.nom}
                </h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {age !== null && (
                    <span className="text-sm text-slate-500 dark:text-[#94A3B8]">{age} ans</span>
                  )}
                  {patient.sexe && (
                    <span className="text-sm text-slate-500 dark:text-[#94A3B8]">
                      {patient.sexe === 'M' ? 'Homme' : 'Femme'}
                    </span>
                  )}
                  {patient.groupe_sanguin && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-full font-semibold">
                      <Droplets className="w-3 h-3" />{patient.groupe_sanguin}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          {(patient.telephone || patient.email) && (
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/[0.06] space-y-2.5">
              <p className="text-[11px] font-bold text-slate-400 dark:text-[#475569] uppercase tracking-wider">Contact</p>
              {patient.telephone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-[#E2E8F0]">{patient.telephone}</span>
                </div>
              )}
              {patient.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-[#E2E8F0]">{patient.email}</span>
                </div>
              )}
            </div>
          )}

          {/* Medical */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-white/[0.06] space-y-4">
            <p className="text-[11px] font-bold text-slate-400 dark:text-[#475569] uppercase tracking-wider">Données médicales</p>

            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-[#94A3B8] mb-2">Pathologies chroniques</p>
              {(patient.pathologies ?? []).length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {(patient.pathologies ?? []).map(p => (
                    <Badge key={p} label={p} color="bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400" />
                  ))}
                </div>
              ) : <p className="text-xs text-slate-400 dark:text-slate-600">Aucune</p>}
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-[#94A3B8] mb-2">Allergies médicamenteuses</p>
              {(patient.allergies_medicaments ?? []).length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {(patient.allergies_medicaments ?? []).map(a => (
                    <Badge key={a} label={a} color="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400" />
                  ))}
                </div>
              ) : <p className="text-xs text-slate-400 dark:text-slate-600">Aucune</p>}
            </div>

            {(patient.allergies_alimentaires ?? []).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-[#94A3B8] mb-2">Allergies alimentaires</p>
                <div className="flex flex-wrap gap-1.5">
                  {(patient.allergies_alimentaires ?? []).map(a => (
                    <Badge key={a} label={a} color="bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400" />
                  ))}
                </div>
              </div>
            )}

            {patient.traitements_en_cours && (
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-[#94A3B8] mb-1">Traitements en cours</p>
                <p className="text-xs text-slate-600 dark:text-[#94A3B8] bg-slate-50 dark:bg-white/[0.04] rounded-lg p-2.5 leading-relaxed">
                  {patient.traitements_en_cours}
                </p>
              </div>
            )}
            {patient.antecedents_chirurgicaux && (
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-[#94A3B8] mb-1">Antécédents chirurgicaux</p>
                <p className="text-xs text-slate-600 dark:text-[#94A3B8] bg-slate-50 dark:bg-white/[0.04] rounded-lg p-2.5 leading-relaxed">
                  {patient.antecedents_chirurgicaux}
                </p>
              </div>
            )}
          </div>

          {/* Score de risque */}
          {(() => {
            const risk = calculateRiskScore(patient);
            return (
              <div className="px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
                <p className="text-[11px] font-bold text-slate-400 dark:text-[#475569] uppercase tracking-wider mb-3">Score de risque</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-100 dark:bg-white/[0.07] rounded-full h-2.5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${risk.score}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        risk.category === 'low' ? 'bg-emerald-400' :
                        risk.category === 'moderate' ? 'bg-amber-400' :
                        risk.category === 'high' ? 'bg-red-400' : 'bg-red-700'
                      }`}
                    />
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${risk.badgeClass}`}>
                    {risk.alertIcon && <ShieldAlert className="w-3 h-3" />}
                    {risk.label} ({risk.score}/100)
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Suivi */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-white/[0.06] space-y-3">
            <p className="text-[11px] font-bold text-slate-400 dark:text-[#475569] uppercase tracking-wider">Suivi clinique</p>
            <div className="flex items-center gap-3">
              <UserCheck className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 dark:text-[#475569]">Médecin référent</p>
                <p className="text-sm font-medium text-slate-700 dark:text-[#E2E8F0]">{meta.doctorName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 dark:text-[#475569]">Dernière visite</p>
                <p className="text-sm font-medium text-slate-700 dark:text-[#E2E8F0]">
                  {meta.lastVisit ? `${relativeDate(meta.lastVisit)} (${new Date(meta.lastVisit).toLocaleDateString('fr-FR')})` : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Ordonnances */}
          <div className="px-6 py-4">
            <p className="text-[11px] font-bold text-slate-400 dark:text-[#475569] uppercase tracking-wider mb-3">
              Dernières ordonnances
            </p>
            {ordsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-white/[0.04] rounded-xl animate-pulse" />)}
              </div>
            ) : ordonnances.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-600">Aucune ordonnance</p>
            ) : (
              <div className="space-y-2">
                {ordonnances.map(o => (
                  <div key={o.id} className="flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-white/[0.04] rounded-xl border border-slate-100 dark:border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                      <p className="text-xs text-slate-600 dark:text-[#94A3B8]">
                        {new Date(o.date || o.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      o.statut === 'active'
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : o.statut === 'expired'
                        ? 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400'
                        : 'bg-slate-100 text-slate-400 dark:bg-white/[0.07]'
                    }`}>
                      {o.statut === 'active' ? 'Active' : o.statut === 'expired' ? 'Expirée' : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ClinicPatientsViewProps {
  orgId?:   string;
  doctors?: DoctorWithProfile[];
}

export function ClinicPatientsView({ orgId, doctors = [] }: ClinicPatientsViewProps) {
  const [patients, setPatients]   = useState<Patient[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(0);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState<FilterType>('all');
  const [sortKey, setSortKey]     = useState<SortKey>(null);
  const [sortDir, setSortDir]     = useState<SortDir>('asc');
  const [loading, setLoading]     = useState(true);
  const [metaMap, setMetaMap]     = useState<Map<string, PatientMeta>>(new Map());
  const [selected, setSelected]   = useState<Patient | null>(null);
  const [exporting, setExporting] = useState(false);
  const PAGE_SIZE = 20;

  const doctorByUserId = new Map(doctors.map(d => [d.user_id, `Dr. ${d.prenom} ${d.nom}`]));

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      let q = supabase.from('patients').select('*', { count: 'exact' }).eq('org_id', orgId);

      if (search.trim()) q = q.or(`prenom.ilike.%${search.trim()}%,nom.ilike.%${search.trim()}%`);
      if (filter === 'allergies')   q = q.not('allergies_medicaments', 'is', null);
      if (filter === 'pathologies') q = q.not('pathologies', 'is', null);
      if (filter === 'recent') {
        const d30 = new Date(); d30.setDate(d30.getDate() - 30);
        q = q.gte('created_at', d30.toISOString());
      }

      if (sortKey === 'nom')       q = q.order('nom',            { ascending: sortDir === 'asc' });
      else if (sortKey === 'age')  q = q.order('date_naissance', { ascending: sortDir === 'desc' });
      else                         q = q.order('created_at',     { ascending: false });

      q = q.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      const { data, count, error } = await q;
      if (error || !data) { setLoading(false); return; }

      setPatients(data);
      setTotal(count ?? 0);

      // Load metadata (médecin référent + dernière visite)
      const patIds = data.map(p => p.id);
      if (patIds.length) {
        const m = new Map<string, PatientMeta>();

        const { data: cons } = await supabase
          .from('consultations').select('patient_id, doctor_id, date')
          .in('patient_id', patIds).order('date', { ascending: false });

        for (const c of (cons ?? [])) {
          if (!m.has(c.patient_id)) {
            m.set(c.patient_id, { doctorName: doctorByUserId.get(c.doctor_id) ?? '—', lastVisit: c.date });
          }
        }

        const noConsIds = patIds.filter(id => !m.has(id));
        if (noConsIds.length) {
          const { data: ords } = await supabase
            .from('ordonnances').select('patient_id, doctor_id, created_at')
            .in('patient_id', noConsIds).order('created_at', { ascending: false });
          for (const o of (ords ?? [])) {
            if (!m.has(o.patient_id)) {
              m.set(o.patient_id, { doctorName: doctorByUserId.get(o.doctor_id) ?? '—', lastVisit: o.created_at });
            }
          }
        }

        for (const id of patIds) {
          if (!m.has(id)) m.set(id, { doctorName: '—', lastVisit: null });
        }
        setMetaMap(m);
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, search, filter, sortKey, sortDir, page]);

  useEffect(() => { setPage(0); }, [search, filter, sortKey, sortDir]);
  useEffect(() => { load(); }, [load]);

  const displayedPatients = sortKey === 'last_visit'
    ? [...patients].sort((a, b) => {
        const da = metaMap.get(a.id)?.lastVisit ?? '';
        const db = metaMap.get(b.id)?.lastVisit ?? '';
        return sortDir === 'asc' ? da.localeCompare(db) : db.localeCompare(da);
      })
    : patients;

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  async function handleExport() {
    if (!orgId || exporting) return;
    setExporting(true);
    try {
      const { data } = await supabase.from('patients').select('*').eq('org_id', orgId).order('nom');
      if (!data) return;
      const exportMeta = new Map<string, PatientMeta>(metaMap);
      const missing = data.filter(p => !exportMeta.has(p.id));
      if (missing.length) {
        const ids = missing.map(p => p.id);
        const { data: cons } = await supabase
          .from('consultations').select('patient_id, doctor_id, date')
          .in('patient_id', ids).order('date', { ascending: false });
        for (const c of (cons ?? [])) {
          if (!exportMeta.has(c.patient_id)) {
            exportMeta.set(c.patient_id, { doctorName: doctorByUserId.get(c.doctor_id) ?? '—', lastVisit: c.date });
          }
        }
        for (const id of ids) {
          if (!exportMeta.has(id)) exportMeta.set(id, { doctorName: '—', lastVisit: null });
        }
      }
      downloadCSV(buildCSV(data, exportMeta), `patients_clinique_${new Date().toISOString().slice(0,10)}.csv`);
    } finally { setExporting(false); }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all',         label: 'Tous'             },
    { key: 'allergies',   label: 'Avec allergies'   },
    { key: 'pathologies', label: 'Avec pathologies' },
    { key: 'recent',      label: 'Récents (30j)'    },
  ];

  function TH({ label, sKey }: { label: string; sKey?: SortKey }) {
    return (
      <th className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-500 dark:text-[#475569] uppercase tracking-wide whitespace-nowrap">
        {sKey
          ? <button onClick={() => toggleSort(sKey)} className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-[#E2E8F0] transition-colors">
              {label}
              <SortBtn col={sKey} active={sortKey === sKey} dir={sortDir} onClick={() => toggleSort(sKey)} />
            </button>
          : label}
      </th>
    );
  }

  return (
    <PageTransition>
      <div className="p-6 max-w-[1500px]">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-[#E2E8F0]">Patients de la clinique</h1>
            <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-0.5">
              {total} patient{total !== 1 ? 's' : ''} enregistré{total !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-[#94A3B8] bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors disabled:opacity-60"
          >
            {exporting
              ? <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              : <Download className="w-4 h-4" />}
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
              placeholder="Nom, prénom, pathologie…"
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] rounded-xl text-sm text-slate-900 dark:text-[#E2E8F0] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 dark:focus:ring-[#00A86B]/40"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-4 h-4 text-slate-400 mr-0.5" />
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filter === f.key
                    ? 'bg-[#00A86B] text-white'
                    : 'bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-[#94A3B8] hover:border-[#00A86B]'
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
                  <TH label="Nom complet"       sKey="nom"        />
                  <TH label="Âge"               sKey="age"        />
                  <TH label="Médecin référent"                    />
                  <TH label="Pathologies"                         />
                  <TH label="Allergies"                           />
                  <TH label="Risque"                              />
                  <TH label="Dernière visite"   sKey="last_visit" />
                  <TH label="Téléphone"                           />
                  <TH label="Actions"                             />
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                  : displayedPatients.length === 0
                  ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center">
                        <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                        <p className="text-sm text-slate-400 dark:text-slate-600">Aucun patient trouvé</p>
                      </td>
                    </tr>
                  )
                  : displayedPatients.map((p, i) => {
                    const age  = getAge(p.date_naissance);
                    const meta = metaMap.get(p.id) ?? { doctorName: '—', lastVisit: null };
                    return (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.025 }}
                        className="border-b border-slate-50 dark:border-white/[0.03] hover:bg-slate-50/70 dark:hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br bg-[#00A86B] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {p.prenom[0]}{p.nom[0]}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">{p.prenom} {p.nom}</p>
                              {p.sexe && <p className="text-xs text-slate-400 dark:text-[#475569]">{p.sexe === 'M' ? 'Homme' : 'Femme'}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-[#94A3B8]">
                          {age !== null ? `${age} ans` : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-[#94A3B8]">{meta.doctorName}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {(p.pathologies ?? []).slice(0, 2).map(path => (
                              <Badge key={path} label={path} color="bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400" />
                            ))}
                            {(p.pathologies ?? []).length > 2 && (
                              <Badge label={`+${p.pathologies!.length - 2}`} color="bg-slate-100 dark:bg-white/[0.07] text-slate-500" />
                            )}
                            {!p.pathologies?.length && <span className="text-xs text-slate-300 dark:text-slate-700">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {(p.allergies_medicaments ?? []).slice(0, 2).map(a => (
                              <Badge key={a} label={a} color="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400" />
                            ))}
                            {(p.allergies_medicaments ?? []).length > 2 && (
                              <div className="flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-red-400" />
                                <span className="text-xs text-red-500">+{p.allergies_medicaments!.length - 2}</span>
                              </div>
                            )}
                            {!p.allergies_medicaments?.length && <span className="text-xs text-slate-300 dark:text-slate-700">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {(() => {
                            const risk = calculateRiskScore(p);
                            return (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${risk.badgeClass}`}>
                                {risk.alertIcon && <ShieldAlert className="w-3 h-3" />}
                                {risk.label}
                                <span className="opacity-70 ml-0.5">{risk.score}</span>
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3.5">
                          {meta.lastVisit ? (
                            <div>
                              <p className="text-sm text-slate-700 dark:text-[#E2E8F0]">{relativeDate(meta.lastVisit)}</p>
                              <p className="text-[11px] text-slate-400 dark:text-[#475569]">
                                {new Date(meta.lastVisit).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          ) : <span className="text-xs text-slate-300 dark:text-slate-700">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-[#94A3B8]">{p.telephone ?? '—'}</td>
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => setSelected(p)}
                            className="text-xs font-semibold text-[#00A86B] hover:text-[#006B47] dark:hover:text-[#00A86B] transition-colors"
                          >
                            Voir fiche
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 dark:border-white/[0.06]">
              <p className="text-xs text-slate-400 dark:text-[#475569]">
                Page {page + 1} / {totalPages} — {total} patients
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

        {!loading && total === 0 && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-400 dark:text-slate-600">
            <Activity className="w-4 h-4" />
            <span>Aucun patient enregistré dans cette organisation</span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <PatientDetailModal
            key={selected.id}
            patient={selected}
            meta={metaMap.get(selected.id) ?? { doctorName: '—', lastVisit: null }}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
