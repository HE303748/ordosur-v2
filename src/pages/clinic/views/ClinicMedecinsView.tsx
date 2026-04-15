import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, UserPlus, X, Users, FileText, Calendar,
  ChevronRight, Mail, Hash, Stethoscope, Send, CheckCircle, Copy,
} from 'lucide-react';
import { PageTransition } from '../../../components/ui/PageTransition';
import { supabase } from '../../../lib/supabase';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface DoctorWithProfile {
  id: string;
  user_id: string;
  rpps: string | null;
  specialite: string | null;
  prenom: string;
  nom: string;
  email?: string;
}

interface DoctorStats {
  ordonnances: number;
  patients: number;
  rdvCeMois: number;
}

interface ClinicMedecinsViewProps {
  doctors: DoctorWithProfile[];
  orgId?: string;
  onDoctorsChange?: () => void;
}

// ─── AVATAR COLORS ────────────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
  'from-sky-400 to-cyan-500',
  'from-violet-400 to-purple-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-cyan-400 to-blue-500',
];

// ─── INVITE MODAL ─────────────────────────────────────────────────────────────

function InviteModal({
  orgId,
  onClose,
}: {
  orgId: string;
  onClose: () => void;
}) {
  const [email, setEmail]         = useState('');
  const [specialite, setSpecialite] = useState('');
  const [message, setMessage]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied]       = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError('L\'email est requis'); return; }
    setError('');
    setLoading(true);
    try {
      const { data, error: dbErr } = await supabase
        .from('clinic_invitations')
        .insert({ org_id: orgId, email: email.trim(), specialite: specialite.trim() || null })
        .select('token')
        .single();

      if (dbErr) throw dbErr;

      const token = data?.token as string | undefined;
      if (token) {
        setInviteLink(`${window.location.origin}/accept-invitation?token=${token}`);
      } else {
        setInviteLink(`${window.location.origin}/accept-invitation`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'invitation';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl shadow-xl w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-[#E2E8F0]">Inviter un médecin</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.07] text-slate-400 dark:text-[#94A3B8]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {inviteLink ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                Invitation envoyée avec succès !
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] mb-2">Lien d'invitation :</p>
              <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl">
                <p className="text-xs text-slate-600 dark:text-[#E2E8F0] flex-1 truncate font-mono">{inviteLink}</p>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 p-1.5 hover:bg-slate-200 dark:hover:bg-white/[0.1] rounded-lg transition-colors"
                >
                  {copied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-[#94A3B8] mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="medecin@exemple.fr"
                className="w-full px-4 py-2.5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl text-sm text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-500/40 placeholder-slate-400 dark:placeholder-slate-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-[#94A3B8] mb-1.5">
                Spécialité
              </label>
              <input
                type="text"
                value={specialite}
                onChange={e => setSpecialite(e.target.value)}
                placeholder="Ex: Cardiologie"
                className="w-full px-4 py-2.5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl text-sm text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-500/40 placeholder-slate-400 dark:placeholder-slate-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-[#94A3B8] mb-1.5">
                Message optionnel
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                placeholder="Message personnalisé..."
                className="w-full px-4 py-2.5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl text-sm text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-500/40 placeholder-slate-400 dark:placeholder-slate-600 resize-none"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-xl">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-[#94A3B8] rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Envoyer
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function ClinicMedecinsView({ doctors, orgId, onDoctorsChange }: ClinicMedecinsViewProps) {
  const [search, setSearch]                 = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorWithProfile | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [doctorStats, setDoctorStats]       = useState<DoctorStats | null>(null);
  const [statsLoading, setStatsLoading]     = useState(false);
  const loadedDoctorId = useRef<string | null>(null);

  const filtered = doctors.filter(d => {
    const q = search.toLowerCase();
    return (
      d.prenom.toLowerCase().includes(q) ||
      d.nom.toLowerCase().includes(q) ||
      (d.specialite ?? '').toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (selectedDoctor && selectedDoctor.id !== loadedDoctorId.current) {
      loadDoctorStats(selectedDoctor);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDoctor]);

  async function loadDoctorStats(doctor: DoctorWithProfile) {
    setStatsLoading(true);
    loadedDoctorId.current = doctor.id;
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [ordRes, patRes, rdvRes] = await Promise.all([
        supabase
          .from('ordonnances')
          .select('id', { count: 'exact', head: true })
          .eq('doctor_id', doctor.id),
        supabase
          .from('patients')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId ?? ''),
        supabase
          .from('rdv')
          .select('id', { count: 'exact', head: true })
          .eq('doctor_id', doctor.id)
          .gte('created_at', startOfMonth),
      ]);

      setDoctorStats({
        ordonnances: ordRes.count ?? 0,
        patients: patRes.count ?? 0,
        rdvCeMois: rdvRes.count ?? 0,
      });
    } catch (err) {
      console.error('[ClinicMedecinsView] loadDoctorStats error:', err);
    } finally {
      setStatsLoading(false);
    }
  }

  return (
    <PageTransition>
      <div className="flex gap-5 h-[calc(100vh-8rem)]">

        {/* ── Left panel: Doctor list ── */}
        <div className="w-[40%] flex-shrink-0 flex flex-col gap-3">
          {/* Search + Invite */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un médecin..."
                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl text-sm text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-500/40 placeholder-slate-400 dark:placeholder-slate-600"
              />
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-3 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-medium transition-colors flex-shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Inviter</span>
            </button>
          </div>

          {/* Doctor list */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <Users className="w-10 h-10 text-slate-200 dark:text-slate-700 mb-3" />
                <p className="text-sm text-slate-400 dark:text-slate-600">Aucun médecin trouvé</p>
              </div>
            ) : (
              filtered.map((doctor, idx) => {
                const initials = `${doctor.prenom[0] ?? ''}${doctor.nom[0] ?? ''}`.toUpperCase();
                const gradient = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
                const isSelected = selectedDoctor?.id === doctor.id;
                return (
                  <motion.div
                    key={doctor.id}
                    whileHover={{ y: -1 }}
                    onClick={() => { setSelectedDoctor(doctor); setDoctorStats(null); }}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/30'
                        : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.1]'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] truncate">
                        Dr. {doctor.prenom} {doctor.nom}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-[#94A3B8] truncate">
                        {doctor.specialite ?? 'Médecin généraliste'}
                      </p>
                    </div>
                    <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-sky-500' : 'text-slate-300 dark:text-slate-600'}`} />
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right panel: Doctor detail ── */}
        <div className="flex-1 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl shadow-sm overflow-y-auto">
          <AnimatePresence mode="wait">
            {selectedDoctor ? (
              <motion.div
                key={selectedDoctor.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.18 }}
                className="p-6 space-y-6"
              >
                {/* Header */}
                <div className="flex items-start gap-5">
                  <div
                    className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${
                      AVATAR_GRADIENTS[doctors.indexOf(selectedDoctor) % AVATAR_GRADIENTS.length]
                    } flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-lg`}
                  >
                    {`${selectedDoctor.prenom[0] ?? ''}${selectedDoctor.nom[0] ?? ''}`.toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-[#E2E8F0]">
                      Dr. {selectedDoctor.prenom} {selectedDoctor.nom}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-0.5">
                      {selectedDoctor.specialite ?? 'Médecin généraliste'}
                    </p>
                    {selectedDoctor.rpps && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        RPPS : {selectedDoctor.rpps}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stat mini-cards */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Ordonnances', value: doctorStats?.ordonnances, icon: FileText, color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10' },
                    { label: 'Patients', value: doctorStats?.patients, icon: Users, color: 'text-teal-500 bg-teal-50 dark:bg-teal-500/10' },
                    { label: 'RDV ce mois', value: doctorStats?.rdvCeMois, icon: Calendar, color: 'text-sky-500 bg-sky-50 dark:bg-sky-500/10' },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div
                      key={label}
                      className="bg-slate-50 dark:bg-[#1E293B] border border-slate-100 dark:border-white/[0.05] rounded-xl p-3 text-center"
                    >
                      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mx-auto mb-2`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {statsLoading ? (
                        <div className="h-5 w-8 bg-slate-200 dark:bg-white/[0.07] rounded animate-pulse mx-auto mb-1" />
                      ) : (
                        <p className="text-lg font-bold text-slate-900 dark:text-[#E2E8F0]">{value ?? '—'}</p>
                      )}
                      <p className="text-xs text-slate-400 dark:text-[#94A3B8]">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Informations */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] mb-3">Informations</h3>
                  <div className="space-y-2.5">
                    {selectedDoctor.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <p className="text-sm text-slate-600 dark:text-[#E2E8F0]">{selectedDoctor.email}</p>
                      </div>
                    )}
                    {selectedDoctor.rpps && (
                      <div className="flex items-center gap-3">
                        <Hash className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <p className="text-sm text-slate-600 dark:text-[#E2E8F0]">RPPS : {selectedDoctor.rpps}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Stethoscope className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <p className="text-sm text-slate-600 dark:text-[#E2E8F0]">
                        {selectedDoctor.specialite ?? 'Médecin généraliste'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    disabled
                    className="flex-1 py-2.5 border border-slate-200 dark:border-white/[0.1] text-slate-400 dark:text-slate-600 rounded-xl text-sm font-medium cursor-not-allowed opacity-60"
                    title="Bientôt disponible"
                  >
                    Modifier
                  </button>
                  <button className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-medium transition-colors">
                    Voir l'agenda
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full py-20 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-sm font-medium text-slate-400 dark:text-slate-600">Sélectionnez un médecin</p>
                <p className="text-xs text-slate-300 dark:text-slate-700 mt-1">pour voir sa fiche détaillée</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Invite Modal ── */}
      <AnimatePresence>
        {showInviteModal && orgId && (
          <InviteModal orgId={orgId} onClose={() => { setShowInviteModal(false); onDoctorsChange?.(); }} />
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
