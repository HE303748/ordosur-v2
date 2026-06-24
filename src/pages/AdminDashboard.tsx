import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Users, UserCheck, Search, LogOut,
  X, AlertTriangle, CheckCircle2, RefreshCw, Eye,
  Stethoscope, TrendingUp, Download, CreditCard, Clock,
  ChevronUp, ChevronDown,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/Logo';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrgRow {
  org_id: string;
  name: string;
  type: 'cabinet' | 'clinique';
  status: 'active' | 'trial' | 'comp' | 'suspended';
  created_at: string;
  suspended_at: string | null;
  doctor_count: number;
  patient_count: number;
  last_activity: string | null;
  plan: 'starter' | 'pro' | 'clinique' | null;
  last_payment_at: string | null;
  next_due_date: string | null;
  is_overdue: boolean;
}

interface BillingSummary {
  mrr: number;
  active_count: number;
  trial_count: number;
  comp_count: number;
  suspended_count: number;
  overdue_count: number;
}

interface OrgDoctor {
  doctor_id: string;
  email: string;
  prenom: string;
  nom: string;
  specialite: string | null;
  role: string;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

type SortKey = 'created_at' | 'patient_count' | 'doctor_count' | 'last_activity';
type SortDir = 'asc' | 'desc';

// ─── Config ──────────────────────────────────────────────────────────────────

const DEFAULT_SORT_KEY: SortKey = 'created_at';
const DEFAULT_SORT_DIR: SortDir = 'desc';

const STATUS_LABEL: Record<string, string> = {
  active:    'Actif',
  trial:     'Essai',
  comp:      'Offert',
  suspended: 'Suspendu',
};

const STATUS_CLS: Record<string, string> = {
  active:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  trial:     'bg-blue-50 text-blue-700 border-blue-200',
  comp:      'bg-indigo-50 text-indigo-700 border-indigo-200',
  suspended: 'bg-red-50 text-[#DC2626] border-red-200',
};

const PLAN_LABEL: Record<string, string> = {
  starter:  'Starter',
  pro:      'Pro',
  clinique: 'Clinique',
};

const PLAN_PRICE: Record<string, number> = {
  starter:  190,
  pro:      390,
  clinique: 990,
};

const TABLE_HEADERS: { label: string; sortKey?: SortKey }[] = [
  { label: 'Organisation' },
  { label: 'Type' },
  { label: 'Statut' },
  { label: 'Plan' },
  { label: 'Médecins',      sortKey: 'doctor_count'  },
  { label: 'Patients',      sortKey: 'patient_count' },
  { label: 'Paiement' },
  { label: 'Créé le',       sortKey: 'created_at'    },
  { label: 'Dernière act.', sortKey: 'last_activity' },
  { label: '' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function fmtMrr(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount);
}

function csvCell(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return '""';
  return `"${String(v).replace(/"/g, '""')}"`;
}

// ─── SkeletonRow ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-[#F0F0EC]">
      {Array.from({ length: 10 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${50 + i * 5}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ─── SortIcon ────────────────────────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="text-[#C4C4BB] text-[10px] select-none">↕</span>;
  return dir === 'asc'
    ? <ChevronUp   className="w-3 h-3 text-[#00A86B]" />
    : <ChevronDown className="w-3 h-3 text-[#00A86B]" />;
}

// ─── AdminDashboard ───────────────────────────────────────────────────────────

export function AdminDashboard() {
  const { user, signOut } = useAuth();

  // Data
  const [orgs, setOrgs]               = useState<OrgRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [billing, setBilling]         = useState<BillingSummary | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);

  // Search
  const [search, setSearch] = useState('');

  // Filtres
  const [filterType,      setFilterType]      = useState<'' | 'cabinet' | 'clinique'>('');
  const [filterStatus,    setFilterStatus]    = useState<'' | 'active' | 'trial' | 'comp' | 'suspended'>('');
  const [filterOverdue,   setFilterOverdue]   = useState(false);
  const [filterHideEmpty, setFilterHideEmpty] = useState(false);

  // Tri
  const [sortKey, setSortKey] = useState<SortKey>(DEFAULT_SORT_KEY);
  const [sortDir, setSortDir] = useState<SortDir>(DEFAULT_SORT_DIR);

  // Action loading per org
  const [changingOrg, setChangingOrg] = useState<string | null>(null);
  const [payingOrg,   setPayingOrg]   = useState<string | null>(null);
  const [payMonths,   setPayMonths]   = useState<Record<string, number>>({});

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Confirmation suspension
  const [confirmOrg,    setConfirmOrg]    = useState<OrgRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Drill-down médecins
  const [detailOrg,      setDetailOrg]      = useState<OrgRow | null>(null);
  const [orgDoctors,     setOrgDoctors]     = useState<OrgDoctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);

  // ── Helpers toast ──────────────────────────────────────────────────────────

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500);
  }, []);

  // ── Chargement données ────────────────────────────────────────────────────

  const loadOrgs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_list_organizations');
    if (error) showToast('Erreur lors du chargement des organisations', 'error');
    else setOrgs((data as OrgRow[]) ?? []);
    setLoading(false);
  }, [showToast]);

  const loadBilling = useCallback(async () => {
    setBillingLoading(true);
    const { data, error } = await supabase.rpc('admin_billing_summary');
    if (error) showToast('Erreur lors du chargement de la facturation', 'error');
    else setBilling(data as BillingSummary);
    setBillingLoading(false);
  }, [showToast]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadOrgs(), loadBilling()]);
  }, [loadOrgs, loadBilling]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  // ── Filtres & Tri ─────────────────────────────────────────────────────────

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const resetFilters = () => {
    setSearch('');
    setFilterType('');
    setFilterStatus('');
    setFilterOverdue(false);
    setFilterHideEmpty(false);
    setSortKey(DEFAULT_SORT_KEY);
    setSortDir(DEFAULT_SORT_DIR);
  };

  const hasFilters = !!filterType || !!filterStatus || filterOverdue || filterHideEmpty
    || !!search || sortKey !== DEFAULT_SORT_KEY || sortDir !== DEFAULT_SORT_DIR;

  // ── Computed : liste filtrée + triée ──────────────────────────────────────

  const filtered = useMemo(() => {
    let result = orgs;

    if (search)            result = result.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));
    if (filterType)        result = result.filter(o => o.type === filterType);
    if (filterStatus)      result = result.filter(o => o.status === filterStatus);
    if (filterOverdue)     result = result.filter(o => o.is_overdue);
    if (filterHideEmpty)   result = result.filter(o => o.doctor_count > 0 || o.patient_count > 0);

    return [...result].sort((a, b) => {
      let av: number | string | null;
      let bv: number | string | null;

      if (sortKey === 'doctor_count')  { av = a.doctor_count;  bv = b.doctor_count;  }
      else if (sortKey === 'patient_count') { av = a.patient_count; bv = b.patient_count; }
      else if (sortKey === 'last_activity') { av = a.last_activity; bv = b.last_activity; }
      else                             { av = a.created_at;    bv = b.created_at;    }

      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;

      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [orgs, search, filterType, filterStatus, filterOverdue, filterHideEmpty, sortKey, sortDir]);

  const totalDoctors  = orgs.reduce((s, o) => s + (o.doctor_count  ?? 0), 0);
  const totalPatients = orgs.reduce((s, o) => s + (o.patient_count ?? 0), 0);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleStatusDropdownChange = async (org: OrgRow, newStatus: string) => {
    if (newStatus === org.status) return;
    if (newStatus === 'suspended') { setConfirmOrg(org); return; }
    setChangingOrg(org.org_id);
    const { error } = await supabase.rpc('admin_set_org_status', {
      p_org_id: org.org_id,
      p_status: newStatus,
    });
    if (error) showToast(`Erreur : ${error.message}`, 'error');
    else {
      showToast(`${org.name} — statut : ${STATUS_LABEL[newStatus] ?? newStatus}`, 'success');
      await refreshAll();
    }
    setChangingOrg(null);
  };

  const handleConfirmSuspend = async () => {
    if (!confirmOrg) return;
    setActionLoading(true);
    const { error } = await supabase.rpc('admin_set_org_status', {
      p_org_id: confirmOrg.org_id,
      p_status: 'suspended',
    });
    if (error) showToast(`Erreur : ${error.message}`, 'error');
    else {
      showToast(`${confirmOrg.name} suspendu avec succès.`, 'success');
      await refreshAll();
    }
    setActionLoading(false);
    setConfirmOrg(null);
  };

  const handlePlanChange = async (org: OrgRow, plan: string | null) => {
    if (plan === (org.plan ?? '')) return;
    setChangingOrg(org.org_id);
    const { error } = await supabase.rpc('admin_set_org_plan', {
      p_org_id: org.org_id,
      p_plan: plan || null,
    });
    if (error) showToast(`Erreur : ${error.message}`, 'error');
    else {
      showToast(
        plan
          ? `${org.name} — plan : ${PLAN_LABEL[plan]} (${PLAN_PRICE[plan]} MAD/mois)`
          : `${org.name} — plan retiré`,
        'success',
      );
      await refreshAll();
    }
    setChangingOrg(null);
  };

  const handleMarkPaid = async (org: OrgRow) => {
    const months = payMonths[org.org_id] ?? 1;
    setPayingOrg(org.org_id);
    const { error } = await supabase.rpc('admin_mark_paid', {
      p_org_id: org.org_id,
      p_period_months: months,
    });
    if (error) showToast(`Erreur : ${error.message}`, 'error');
    else {
      showToast(`Paiement enregistré — ${org.name} (${months} mois)`, 'success');
      await refreshAll();
    }
    setPayingOrg(null);
  };

  const openDetails = async (org: OrgRow) => {
    setDetailOrg(org);
    setOrgDoctors([]);
    setDoctorsLoading(true);
    const { data, error } = await supabase.rpc('admin_list_org_doctors', { p_org_id: org.org_id });
    if (error) showToast('Erreur lors du chargement des médecins', 'error');
    else setOrgDoctors((data as OrgDoctor[]) ?? []);
    setDoctorsLoading(false);
  };

  // ── Export CSV (liste filtrée) ─────────────────────────────────────────────

  const exportCsv = () => {
    const headers = [
      'Organisation', 'Type', 'Statut', 'Plan', 'Prix mensuel (MAD)',
      'Médecins', 'Patients', 'Dernier paiement', 'Prochaine échéance',
      'En retard', 'Dernière activité', 'Créé le',
    ];
    const rows = filtered.map(o => [
      csvCell(o.name),
      csvCell(o.type),
      csvCell(STATUS_LABEL[o.status] ?? o.status),
      csvCell(o.plan ? PLAN_LABEL[o.plan] : ''),
      csvCell(o.plan ? PLAN_PRICE[o.plan] : 0),
      csvCell(o.doctor_count),
      csvCell(o.patient_count),
      csvCell(fmtDate(o.last_payment_at)),
      csvCell(fmtDate(o.next_due_date)),
      csvCell(o.is_overdue ? 'Oui' : 'Non'),
      csvCell(fmtDate(o.last_activity)),
      csvCell(fmtDate(o.created_at)),
    ].join(','));
    const csv = [headers.map(csvCell).join(','), ...rows].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const today = new Date().toISOString().slice(0, 10);
    a.download = `ordosur_comptes_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FAFAF7] font-sans">

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#E5E5E0] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo variant="horizontal-light" size="sm" />
            <div className="h-5 w-px bg-[#E5E5E0]" />
            <span className="text-xs font-semibold text-[#475569] tracking-widest uppercase">
              Administration
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-[#475569]">
              {user?.prenom} {user?.nom}
            </span>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#475569] hover:text-[#DC2626] hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        {/* Totaux */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Organisations', value: orgs.length,   icon: Building2, color: 'text-[#0A1628]' },
            { label: 'Médecins',      value: totalDoctors,  icon: UserCheck, color: 'text-[#00A86B]'  },
            { label: 'Patients',      value: totalPatients, icon: Users,     color: 'text-[#475569]'  },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-[#E5E5E0] p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-xs font-medium text-[#475569]">{label}</span>
              </div>
              {loading
                ? <div className="h-7 w-14 bg-slate-100 rounded-lg animate-pulse" />
                : <p className={`text-2xl font-bold tracking-tight ${color}`}>{value}</p>
              }
            </div>
          ))}
        </div>

        {/* Bandeau MRR */}
        <div className="bg-white rounded-2xl border border-[#E5E5E0] shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-[#F0F0EC]">
            <div className="px-6 py-5 flex items-center gap-4 min-w-[220px]">
              <div className="w-10 h-10 rounded-xl bg-[#E6F4EE] flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-[#00A86B]" />
              </div>
              <div>
                <p className="text-xs font-medium text-[#475569] mb-0.5">Revenus mensuels (MRR)</p>
                {billingLoading
                  ? <div className="h-7 w-28 bg-slate-100 rounded-lg animate-pulse" />
                  : (
                    <p className="text-2xl font-bold text-[#0A1628] tracking-tight">
                      {fmtMrr(billing?.mrr ?? 0)}
                      <span className="text-sm font-medium text-[#475569] ml-1">MAD/mois</span>
                    </p>
                  )
                }
              </div>
            </div>
            <div className="flex flex-wrap sm:flex-nowrap items-center divide-x divide-[#F0F0EC] flex-1">
              {[
                { key: 'active_count',    label: 'Actifs',    dot: 'bg-emerald-500' },
                { key: 'trial_count',     label: 'Essai',     dot: 'bg-blue-500'    },
                { key: 'comp_count',      label: 'Offerts',   dot: 'bg-indigo-500'  },
                { key: 'suspended_count', label: 'Suspendus', dot: 'bg-slate-400'   },
              ].map(({ key, label, dot }) => (
                <div key={key} className="px-5 py-5 flex flex-col items-center flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                    <span className="text-[11px] font-medium text-[#475569]">{label}</span>
                  </div>
                  {billingLoading
                    ? <div className="h-6 w-6 bg-slate-100 rounded animate-pulse" />
                    : <span className="text-lg font-bold text-[#0A1628]">{(billing as Record<string, number> | null)?.[key] ?? 0}</span>
                  }
                </div>
              ))}
              <div className="px-5 py-5 flex flex-col items-center flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className={`w-3 h-3 ${(billing?.overdue_count ?? 0) > 0 ? 'text-[#DC2626]' : 'text-[#94A3B8]'}`} />
                  <span className={`text-[11px] font-medium ${(billing?.overdue_count ?? 0) > 0 ? 'text-[#DC2626]' : 'text-[#475569]'}`}>
                    En retard
                  </span>
                </div>
                {billingLoading
                  ? <div className="h-6 w-6 bg-slate-100 rounded animate-pulse" />
                  : <span className={`text-lg font-bold ${(billing?.overdue_count ?? 0) > 0 ? 'text-[#DC2626]' : 'text-[#0A1628]'}`}>
                      {billing?.overdue_count ?? 0}
                    </span>
                }
              </div>
            </div>
          </div>
        </div>

        {/* Barre recherche + actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une organisation..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E5E0] rounded-xl text-sm text-[#0A1628] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00A86B]/30 focus:border-[#00A86B] transition-all"
            />
          </div>
          <button
            onClick={exportCsv}
            disabled={loading || filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E5E5E0] rounded-xl text-sm font-medium text-[#475569] hover:border-[#0A1628] transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exporter CSV</span>
          </button>
          <button
            onClick={refreshAll}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E5E5E0] rounded-xl text-sm font-medium text-[#475569] hover:border-[#0A1628] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>

        {/* ── Barre de filtres ── */}
        <div className="flex flex-wrap items-center gap-2">

          {/* Filtre type — segmenté */}
          <div className="flex rounded-xl border border-[#E5E5E0] overflow-hidden bg-white text-xs">
            {([
              { value: '',        label: 'Tous'      },
              { value: 'cabinet', label: 'Cabinets'  },
              { value: 'clinique',label: 'Cliniques' },
            ] as const).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilterType(value)}
                className={`px-3.5 py-2 font-medium transition-colors border-r last:border-r-0 border-[#E5E5E0] whitespace-nowrap ${
                  filterType === value
                    ? 'bg-[#0A1628] text-white'
                    : 'text-[#475569] hover:bg-[#FAFAF7]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Filtre statut — dropdown */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
            className="text-xs border border-[#E5E5E0] rounded-xl px-3 py-2 text-[#475569] bg-white focus:outline-none focus:ring-1 focus:ring-[#00A86B]/30 cursor-pointer"
          >
            <option value="">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="trial">Essai</option>
            <option value="comp">Offert</option>
            <option value="suspended">Suspendu</option>
          </select>

          {/* Toggle En retard */}
          <button
            onClick={() => setFilterOverdue(v => !v)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
              filterOverdue
                ? 'bg-red-50 text-[#DC2626] border-red-200'
                : 'bg-white text-[#475569] border-[#E5E5E0] hover:border-[#94A3B8]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            En retard
          </button>

          {/* Toggle Masquer vides */}
          <button
            onClick={() => setFilterHideEmpty(v => !v)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
              filterHideEmpty
                ? 'bg-[#E6F4EE] text-[#006B47] border-emerald-200'
                : 'bg-white text-[#475569] border-[#E5E5E0] hover:border-[#94A3B8]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Masquer vides
          </button>

          {/* Réinitialiser */}
          <AnimatePresence>
            {hasFilters && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-[#475569] border border-[#E5E5E0] hover:text-[#DC2626] hover:border-red-200 hover:bg-red-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Réinitialiser
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Compteur + tableau */}
        <div className="space-y-2">

          {/* Compteur */}
          {!loading && (
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-[#475569]">
                <span className="font-semibold text-[#0A1628]">{filtered.length}</span>
                {' '}organisation{filtered.length !== 1 ? 's' : ''} affichée{filtered.length !== 1 ? 's' : ''}
                {filtered.length < orgs.length && (
                  <span className="text-[#94A3B8]"> sur {orgs.length}</span>
                )}
              </p>
            </div>
          )}

          {/* Tableau */}
          <div className="bg-white rounded-2xl border border-[#E5E5E0] shadow-sm overflow-hidden">
            {!loading && filtered.length === 0 ? (
              <div className="p-14 text-center">
                <Building2 className="w-10 h-10 text-[#94A3B8] mx-auto mb-3" />
                <p className="text-[#475569] text-sm mb-3">
                  {hasFilters
                    ? 'Aucune organisation ne correspond aux filtres actifs.'
                    : 'Aucune organisation cliente trouvée.'}
                </p>
                {hasFilters && (
                  <button
                    onClick={resetFilters}
                    className="text-xs font-medium text-[#00A86B] hover:text-[#006B47] transition-colors"
                  >
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#FAFAF7] border-b border-[#E5E5E0]">
                      {TABLE_HEADERS.map(h => (
                        <th
                          key={h.label}
                          onClick={() => h.sortKey && handleSort(h.sortKey)}
                          className={`text-left text-[11px] font-semibold tracking-wider uppercase px-4 py-3 whitespace-nowrap select-none ${
                            h.sortKey
                              ? 'cursor-pointer hover:bg-[#F0F0EC] transition-colors'
                              : ''
                          } ${sortKey === h.sortKey ? 'text-[#0A1628]' : 'text-[#475569]'}`}
                        >
                          {h.sortKey ? (
                            <div className="flex items-center gap-1">
                              {h.label}
                              <SortIcon active={sortKey === h.sortKey} dir={sortDir} />
                            </div>
                          ) : h.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                      : filtered.map((org, i) => {
                          const isChanging = changingOrg === org.org_id;
                          const isPaying   = payingOrg   === org.org_id;
                          const months     = payMonths[org.org_id] ?? 1;

                          return (
                            <motion.tr
                              key={org.org_id}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.025, duration: 0.18 }}
                              className="border-b border-[#F0F0EC] last:border-0 hover:bg-[#FAFAF7] transition-colors"
                            >
                              {/* Organisation */}
                              <td className="px-4 py-3 font-semibold text-[#0A1628] whitespace-nowrap max-w-[180px] truncate">
                                {org.name}
                              </td>

                              {/* Type */}
                              <td className="px-4 py-3 text-[#475569] capitalize whitespace-nowrap">
                                {org.type}
                              </td>

                              {/* Statut */}
                              <td className="px-4 py-3">
                                <select
                                  value={org.status}
                                  onChange={e => handleStatusDropdownChange(org, e.target.value)}
                                  disabled={isChanging}
                                  className={`
                                    text-xs font-semibold border rounded-full px-2.5 py-0.5 cursor-pointer
                                    focus:outline-none focus:ring-2 focus:ring-[#00A86B]/30
                                    appearance-none pr-5 transition-opacity
                                    ${STATUS_CLS[org.status] ?? 'bg-slate-50 text-slate-600 border-slate-200'}
                                    ${isChanging ? 'opacity-50 cursor-not-allowed' : ''}
                                  `}
                                >
                                  <option value="active">Actif</option>
                                  <option value="trial">Essai</option>
                                  <option value="comp">Offert</option>
                                  <option value="suspended">Suspendu</option>
                                </select>
                              </td>

                              {/* Plan */}
                              <td className="px-4 py-3">
                                <select
                                  value={org.plan ?? ''}
                                  onChange={e => handlePlanChange(org, e.target.value || null)}
                                  disabled={isChanging}
                                  className={`
                                    text-xs border border-[#E5E5E0] rounded-lg px-2.5 py-1 cursor-pointer
                                    text-[#0A1628] bg-white
                                    focus:outline-none focus:ring-1 focus:ring-[#00A86B]/30
                                    transition-opacity whitespace-nowrap
                                    ${isChanging ? 'opacity-50 cursor-not-allowed' : ''}
                                  `}
                                >
                                  <option value="">— Aucun</option>
                                  <option value="starter">Starter — 190 MAD</option>
                                  <option value="pro">Pro — 390 MAD</option>
                                  <option value="clinique">Clinique — 990 MAD</option>
                                </select>
                              </td>

                              {/* Médecins */}
                              <td className="px-4 py-3 text-[#475569]">{org.doctor_count}</td>

                              {/* Patients */}
                              <td className="px-4 py-3 text-[#475569]">{org.patient_count}</td>

                              {/* Paiement */}
                              <td className="px-4 py-3">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                                    <span className="text-xs text-[#0A1628] font-medium">
                                      {fmtDate(org.next_due_date)}
                                    </span>
                                    {org.is_overdue && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-[#DC2626] border border-red-200">
                                        <Clock className="w-2.5 h-2.5" />
                                        En retard
                                      </span>
                                    )}
                                  </div>
                                  {org.last_payment_at && (
                                    <p className="text-[11px] text-[#94A3B8] whitespace-nowrap">
                                      Payé le {fmtDate(org.last_payment_at)}
                                    </p>
                                  )}
                                </div>
                              </td>

                              {/* Créé le */}
                              <td className="px-4 py-3 text-[#475569] whitespace-nowrap text-xs">
                                {fmtDate(org.created_at)}
                              </td>

                              {/* Dernière activité */}
                              <td className="px-4 py-3 text-[#475569] whitespace-nowrap text-xs">
                                {fmtDate(org.last_activity)}
                              </td>

                              {/* Actions */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2 justify-end">
                                  <button
                                    onClick={() => openDetails(org)}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#475569] border border-[#E5E5E0] hover:border-[#0A1628] hover:text-[#0A1628] transition-colors whitespace-nowrap"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    Détails
                                  </button>
                                  <div className="flex items-center gap-1">
                                    <select
                                      value={months}
                                      onChange={e => setPayMonths(prev => ({
                                        ...prev, [org.org_id]: parseInt(e.target.value),
                                      }))}
                                      disabled={isPaying}
                                      className="text-xs border border-[#E5E5E0] rounded-lg px-1.5 py-1 text-[#475569] bg-white focus:outline-none focus:ring-1 focus:ring-[#00A86B]/30 cursor-pointer"
                                    >
                                      {[1, 3, 6, 12].map(m => (
                                        <option key={m} value={m}>{m} mois</option>
                                      ))}
                                    </select>
                                    <button
                                      onClick={() => handleMarkPaid(org)}
                                      disabled={isPaying}
                                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#00A86B] border border-emerald-200 hover:bg-emerald-50 transition-colors disabled:opacity-50 whitespace-nowrap"
                                    >
                                      {isPaying
                                        ? <span className="w-3 h-3 border-2 border-[#00A86B]/30 border-t-[#00A86B] rounded-full animate-spin" />
                                        : <CreditCard className="w-3.5 h-3.5" />
                                      }
                                      Payé
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })
                    }
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Modal confirmation suspension ── */}
      <AnimatePresence>
        {confirmOrg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget && !actionLoading) setConfirmOrg(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18 }}
              className="bg-white rounded-2xl border border-[#E5E5E0] shadow-xl p-6 w-full max-w-sm"
            >
              <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-[#DC2626]" />
              </div>
              <h2 className="text-base font-bold text-[#0A1628] text-center mb-2">
                Suspendre ce cabinet ?
              </h2>
              <p className="text-sm text-[#475569] text-center mb-1 font-medium">{confirmOrg.name}</p>
              <p className="text-xs text-[#475569] text-center mb-6 leading-relaxed">
                Les utilisateurs de ce cabinet perdront immédiatement l'accès à leurs données.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmOrg(null)}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#E5E5E0] text-[#475569] hover:border-[#0A1628] transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmSuspend}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#DC2626] hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  {actionLoading && (
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  )}
                  Suspendre
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal détails médecins ── */}
      <AnimatePresence>
        {detailOrg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setDetailOrg(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18 }}
              className="bg-white rounded-2xl border border-[#E5E5E0] shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="flex items-start justify-between p-5 border-b border-[#E5E5E0]">
                <div>
                  <h2 className="font-bold text-[#0A1628] text-base">{detailOrg.name}</h2>
                  <p className="text-xs text-[#475569] mt-0.5 capitalize">
                    {detailOrg.type} · {detailOrg.doctor_count} médecin{detailOrg.doctor_count !== 1 ? 's' : ''}
                    {detailOrg.plan && ` · ${PLAN_LABEL[detailOrg.plan]}`}
                  </p>
                </div>
                <button
                  onClick={() => setDetailOrg(null)}
                  className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0A1628] hover:bg-[#F0F0EC] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 max-h-[60vh] overflow-y-auto">
                {doctorsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#FAFAF7]">
                        <div className="w-9 h-9 rounded-full bg-slate-200 animate-pulse flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 w-32 bg-slate-200 rounded animate-pulse" />
                          <div className="h-3 w-44 bg-slate-100 rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : orgDoctors.length === 0 ? (
                  <div className="py-8 text-center">
                    <Stethoscope className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
                    <p className="text-sm text-[#475569]">Aucun médecin trouvé.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {orgDoctors.map(doc => (
                      <div
                        key={doc.doctor_id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-[#FAFAF7] border border-[#F0F0EC]"
                      >
                        <div className="w-9 h-9 rounded-full bg-[#E6F4EE] flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-[#00A86B]">
                            {doc.prenom?.[0] ?? '?'}{doc.nom?.[0] ?? ''}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[#0A1628] truncate">
                            Dr. {doc.prenom} {doc.nom}
                          </p>
                          <p className="text-xs text-[#475569] truncate">{doc.email}</p>
                          {doc.specialite && (
                            <p className="text-xs text-[#94A3B8] truncate">{doc.specialite}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toasts ── */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border max-w-xs ${
                t.type === 'success'
                  ? 'bg-white text-[#0A1628] border-[#E5E5E0]'
                  : 'bg-[#FEF2F2] text-[#DC2626] border-red-200'
              }`}
            >
              {t.type === 'success'
                ? <CheckCircle2 className="w-4 h-4 text-[#00A86B] flex-shrink-0" />
                : <AlertTriangle className="w-4 h-4 text-[#DC2626] flex-shrink-0" />
              }
              <span>{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
