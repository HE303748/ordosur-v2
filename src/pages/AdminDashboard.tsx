import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Users, UserCheck, Search, LogOut,
  X, AlertTriangle, CheckCircle2, RefreshCw, Eye,
  Stethoscope,
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

// ─── Config statuts ──────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  active: 'Actif',
  trial: 'Essai',
  comp: 'Complimentaire',
  suspended: 'Suspendu',
};

const STATUS_CLS: Record<string, string> = {
  active:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  trial:     'bg-blue-50 text-blue-700 border-blue-200',
  comp:      'bg-indigo-50 text-indigo-700 border-indigo-200',
  suspended: 'bg-red-50 text-[#DC2626] border-red-200',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─── Skeleton row ────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-[#F0F0EC]">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${60 + i * 8}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ─── AdminDashboard ───────────────────────────────────────────────────────────

export function AdminDashboard() {
  const { user, signOut } = useAuth();

  // Data
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Confirmation suspension/réactivation
  const [confirmOrg, setConfirmOrg] = useState<OrgRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Drill-down médecins
  const [detailOrg, setDetailOrg] = useState<OrgRow | null>(null);
  const [orgDoctors, setOrgDoctors] = useState<OrgDoctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);

  // ── Helpers toast ──────────────────────────────────────────────────────────

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500);
  }, []);

  // ── Chargement orgs ────────────────────────────────────────────────────────

  const loadOrgs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_list_organizations');
    if (error) {
      showToast('Erreur lors du chargement des organisations', 'error');
    } else {
      setOrgs((data as OrgRow[]) ?? []);
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { loadOrgs(); }, [loadOrgs]);

  // ── Changement de statut ───────────────────────────────────────────────────

  const handleStatusChange = async () => {
    if (!confirmOrg) return;
    const newStatus = confirmOrg.status === 'suspended' ? 'active' : 'suspended';
    setActionLoading(true);
    const { error } = await supabase.rpc('admin_set_org_status', {
      p_org_id: confirmOrg.org_id,
      p_status: newStatus,
    });
    if (error) {
      showToast(`Erreur : ${error.message}`, 'error');
    } else {
      showToast(
        newStatus === 'suspended'
          ? `${confirmOrg.name} suspendu avec succès.`
          : `${confirmOrg.name} réactivé avec succès.`,
        'success',
      );
      await loadOrgs();
    }
    setActionLoading(false);
    setConfirmOrg(null);
  };

  // ── Drill-down médecins ────────────────────────────────────────────────────

  const openDetails = async (org: OrgRow) => {
    setDetailOrg(org);
    setOrgDoctors([]);
    setDoctorsLoading(true);
    const { data, error } = await supabase.rpc('admin_list_org_doctors', { p_org_id: org.org_id });
    if (error) {
      showToast('Erreur lors du chargement des médecins', 'error');
    } else {
      setOrgDoctors((data as OrgDoctor[]) ?? []);
    }
    setDoctorsLoading(false);
  };

  // ── Computed ───────────────────────────────────────────────────────────────

  const filtered = orgs.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()),
  );
  const totalDoctors  = orgs.reduce((s, o) => s + (o.doctor_count  ?? 0), 0);
  const totalPatients = orgs.reduce((s, o) => s + (o.patient_count ?? 0), 0);

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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Bandeau de totaux */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Organisations',  value: orgs.length,   icon: Building2, color: 'text-[#0A1628]' },
            { label: 'Médecins',       value: totalDoctors,  icon: UserCheck, color: 'text-[#00A86B]'  },
            { label: 'Patients',       value: totalPatients, icon: Users,     color: 'text-[#475569]'  },
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

        {/* Barre recherche + actualiser */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
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
            onClick={loadOrgs}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E5E5E0] rounded-xl text-sm font-medium text-[#475569] hover:border-[#0A1628] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-2xl border border-[#E5E5E0] shadow-sm overflow-hidden">
          {!loading && filtered.length === 0 ? (
            <div className="p-14 text-center">
              <Building2 className="w-10 h-10 text-[#94A3B8] mx-auto mb-3" />
              <p className="text-[#475569] text-sm">
                {search
                  ? 'Aucune organisation ne correspond à votre recherche.'
                  : 'Aucune organisation cliente trouvée.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#FAFAF7] border-b border-[#E5E5E0]">
                    {['Organisation', 'Type', 'Statut', 'Médecins', 'Patients', 'Créé le', 'Dernière activité', ''].map(h => (
                      <th
                        key={h}
                        className="text-left text-[11px] font-semibold text-[#475569] tracking-wider uppercase px-4 py-3 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                    : filtered.map((org, i) => (
                        <motion.tr
                          key={org.org_id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03, duration: 0.2 }}
                          className="border-b border-[#F0F0EC] last:border-0 hover:bg-[#FAFAF7] transition-colors"
                        >
                          <td className="px-4 py-3 font-semibold text-[#0A1628]">{org.name}</td>
                          <td className="px-4 py-3 text-[#475569] capitalize">{org.type}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_CLS[org.status] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                              {STATUS_LABEL[org.status] ?? org.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#475569]">{org.doctor_count}</td>
                          <td className="px-4 py-3 text-[#475569]">{org.patient_count}</td>
                          <td className="px-4 py-3 text-[#475569] whitespace-nowrap">{fmtDate(org.created_at)}</td>
                          <td className="px-4 py-3 text-[#475569] whitespace-nowrap">{fmtDate(org.last_activity)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                onClick={() => openDetails(org)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#475569] border border-[#E5E5E0] hover:border-[#0A1628] hover:text-[#0A1628] transition-colors whitespace-nowrap"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Détails
                              </button>
                              {org.status === 'suspended' ? (
                                <button
                                  onClick={() => setConfirmOrg(org)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#00A86B] border border-emerald-200 hover:bg-emerald-50 transition-colors whitespace-nowrap"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Réactiver
                                </button>
                              ) : (
                                <button
                                  onClick={() => setConfirmOrg(org)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#DC2626] border border-red-200 hover:bg-red-50 transition-colors whitespace-nowrap"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  Suspendre
                                </button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ── Modal confirmation suspension/réactivation ── */}
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
              <div className={`w-12 h-12 mx-auto mb-4 rounded-2xl flex items-center justify-center ${confirmOrg.status === 'suspended' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                {confirmOrg.status === 'suspended'
                  ? <CheckCircle2 className="w-6 h-6 text-[#00A86B]" />
                  : <AlertTriangle className="w-6 h-6 text-[#DC2626]" />
                }
              </div>
              <h2 className="text-base font-bold text-[#0A1628] text-center mb-2">
                {confirmOrg.status === 'suspended' ? 'Réactiver' : 'Suspendre'} ce cabinet ?
              </h2>
              <p className="text-sm text-[#475569] text-center mb-1 font-medium">{confirmOrg.name}</p>
              {confirmOrg.status !== 'suspended' && (
                <p className="text-xs text-[#475569] text-center mb-5 leading-relaxed">
                  Les utilisateurs de ce cabinet perdront immédiatement l'accès à leurs données.
                </p>
              )}
              {confirmOrg.status === 'suspended' && (
                <p className="text-xs text-[#475569] text-center mb-5 leading-relaxed">
                  Les utilisateurs de ce cabinet retrouveront l'accès à leurs données.
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmOrg(null)}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#E5E5E0] text-[#475569] hover:border-[#0A1628] hover:text-[#0A1628] transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleStatusChange}
                  disabled={actionLoading}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                    confirmOrg.status === 'suspended'
                      ? 'bg-[#00A86B] hover:bg-[#006B47]'
                      : 'bg-[#DC2626] hover:bg-red-700'
                  }`}
                >
                  {actionLoading && (
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  )}
                  {confirmOrg.status === 'suspended' ? 'Réactiver' : 'Suspendre'}
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
            onClick={e => { if (e.target === e.currentTarget) { setDetailOrg(null); } }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18 }}
              className="bg-white rounded-2xl border border-[#E5E5E0] shadow-xl w-full max-w-md overflow-hidden"
            >
              {/* Header modal */}
              <div className="flex items-start justify-between p-5 border-b border-[#E5E5E0]">
                <div>
                  <h2 className="font-bold text-[#0A1628] text-base">{detailOrg.name}</h2>
                  <p className="text-xs text-[#475569] mt-0.5 capitalize">
                    {detailOrg.type} · {detailOrg.doctor_count} médecin{detailOrg.doctor_count !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => setDetailOrg(null)}
                  className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0A1628] hover:bg-[#F0F0EC] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Corps modal */}
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
