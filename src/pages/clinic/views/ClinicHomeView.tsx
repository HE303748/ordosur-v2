import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, FileText, AlertTriangle, Activity, Calendar, ChevronRight, UserPlus, UserCheck } from 'lucide-react';
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

interface RdvItem {
  id: string;
  heure_debut: string;
  heure_fin: string | null;
  patient_id: string | null;
  doctor_id: string | null;
  type: string | null;
  patient_name?: string;
  doctor_name?: string;
}

interface ClinicHomeViewProps {
  doctors: DoctorWithProfile[];
  orgId?: string;
  onNavigate?: (v: string) => void;
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'from-sky-400 to-cyan-500',
  'from-violet-400 to-purple-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-cyan-400 to-blue-500',
];

const RDV_COLORS = ['sky', 'violet', 'emerald', 'amber', 'rose', 'cyan'] as const;

const RDV_COLOR_CLASSES: Record<string, string> = {
  sky:     'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  violet:  'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  amber:   'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  rose:    'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  cyan:    'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',
};

// ─── KPI CARD ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub: string;
  color: 'sky' | 'teal' | 'violet' | 'emerald' | 'red';
  loading: boolean;
}) {
  const colorMap = {
    sky:     'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
    teal:    'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400',
    violet:  'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    red:     'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-5 shadow-sm animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-white/[0.07]" />
          <div className="space-y-2 flex-1">
            <div className="h-3 w-24 bg-slate-200 dark:bg-white/[0.07] rounded-xl" />
            <div className="h-7 w-16 bg-slate-200 dark:bg-white/[0.07] rounded-xl" />
            <div className="h-2.5 w-20 bg-slate-200 dark:bg-white/[0.07] rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-5 shadow-sm"
    >
      <div className="flex items-start gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">{label}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-[#E2E8F0] mt-0.5">{value}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function ClinicHomeView({ doctors, orgId, onNavigate }: ClinicHomeViewProps) {
  const [patientsCount, setPatientsCount] = useState(0);
  const [newPatientsCount, setNewPatientsCount] = useState(0);
  const [ordonnancesCount, setOrdonnancesCount] = useState(0);
  const [todayRdv, setTodayRdv] = useState<RdvItem[]>([]);
  const [loading, setLoading] = useState(true);

  const todayDate = new Date();
  const todayStr = todayDate.toISOString().split('T')[0];
  const currentHour = todayDate.getHours();

  const startOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1).toISOString();

  const formattedDate = todayDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    if (orgId) loadData();
    else setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function loadData() {
    try {
      setLoading(true);

      const [patientsRes, newPatientsRes, ordonnancesRes, rdvRes] = await Promise.all([
        supabase.from('patients').select('id', { count: 'exact', head: true }).eq('org_id', orgId!),
        supabase
          .from('patients')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId!)
          .gte('created_at', startOfMonth),
        supabase
          .from('ordonnances')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId!)
          .gte('created_at', startOfMonth),
        supabase
          .from('rdv')
          .select('id, heure_debut, heure_fin, patient_id, doctor_id, type')
          .eq('org_id', orgId!)
          .eq('date', todayStr)
          .order('heure_debut'),
      ]);

      setPatientsCount(patientsRes.count ?? 0);
      setNewPatientsCount(newPatientsRes.count ?? 0);
      setOrdonnancesCount(ordonnancesRes.count ?? 0);

      const rdvItems: RdvItem[] = rdvRes.data ?? [];

      // Enrich RDV with patient and doctor names
      const patientIds = [...new Set(rdvItems.map(r => r.patient_id).filter(Boolean))] as string[];
      const doctorIds  = [...new Set(rdvItems.map(r => r.doctor_id).filter(Boolean))] as string[];

      const [patientsData, doctorsUserIds] = await Promise.all([
        patientIds.length > 0
          ? supabase.from('patients').select('id, prenom, nom').in('id', patientIds)
          : Promise.resolve({ data: [] }),
        doctorIds.length > 0
          ? supabase.from('doctors').select('id, user_id').in('id', doctorIds)
          : Promise.resolve({ data: [] }),
      ]);

      const doctorRows = doctorsUserIds.data ?? [];
      const userIds = doctorRows.map(d => d.user_id).filter(Boolean) as string[];

      const profilesRes = userIds.length > 0
        ? await supabase.from('user_profiles').select('user_id, prenom, nom').in('user_id', userIds)
        : { data: [] };

      const patientMap = new Map((patientsData.data ?? []).map(p => [p.id, `${p.prenom} ${p.nom}`]));
      const userProfileMap = new Map((profilesRes.data ?? []).map(p => [p.user_id, `${p.prenom} ${p.nom}`]));
      const doctorNameMap = new Map(
        doctorRows.map(d => [d.id, userProfileMap.get(d.user_id) ?? 'Dr. Inconnu'])
      );

      const enriched = rdvItems.map(r => ({
        ...r,
        patient_name: r.patient_id ? (patientMap.get(r.patient_id) ?? 'Patient inconnu') : 'Patient inconnu',
        doctor_name: r.doctor_id ? `Dr. ${doctorNameMap.get(r.doctor_id) ?? 'Inconnu'}` : 'Médecin inconnu',
      }));

      setTodayRdv(enriched);
    } catch (err) {
      console.error('[ClinicHomeView] loadData error:', err);
    } finally {
      setLoading(false);
    }
  }

  function getDoctorStatus(doctor: DoctorWithProfile): { label: string; color: string } {
    const isInConsultation = todayRdv.some(rdv => {
      if (rdv.doctor_id !== doctor.id) return false;
      const hour = parseInt(rdv.heure_debut.split(':')[0] ?? '0', 10);
      return hour === currentHour;
    });

    if (isInConsultation) {
      return { label: 'En consultation', color: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300' };
    }
    return { label: 'Disponible', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' };
  }

  const interactionsCount = 0;

  return (
    <PageTransition>
      <div className="space-y-6">

        {/* ── Welcome header ── */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#E2E8F0]">
            Bonjour 👋 — Tableau de bord de la Clinique
          </h1>
          <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-1 capitalize">{formattedDate}</p>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            icon={Users}
            label="Médecins actifs"
            value={doctors.length}
            sub={`${doctors.length} spécialiste(s)`}
            color="sky"
            loading={false}
          />
          <KpiCard
            icon={UserCheck}
            label="Total patients"
            value={patientsCount}
            sub={`+${newPatientsCount} ce mois`}
            color="teal"
            loading={loading}
          />
          <KpiCard
            icon={FileText}
            label="Ordonnances ce mois"
            value={ordonnancesCount}
            sub="Ce mois"
            color="violet"
            loading={loading}
          />
          <KpiCard
            icon={AlertTriangle}
            label="Interactions"
            value={interactionsCount}
            sub="Aucune détectée"
            color={interactionsCount > 0 ? 'red' : 'emerald'}
            loading={false}
          />
        </div>

        {/* ── 3-column layout ── */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

          {/* Col 1: Équipe médicale (2/5) */}
          <div className="xl:col-span-2">
            <motion.div
              whileHover={{ y: -1 }}
              className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl shadow-sm p-5 h-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">Équipe médicale</h2>
                <button
                  onClick={() => onNavigate?.('medecins')}
                  className="text-xs text-sky-500 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300 flex items-center gap-1"
                >
                  Voir tous <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {doctors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Users className="w-10 h-10 text-slate-200 dark:text-slate-700 mb-3" />
                  <p className="text-sm text-slate-400 dark:text-slate-600">Aucun médecin enregistré</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {doctors.slice(0, 5).map((doctor, idx) => {
                    const initials = `${doctor.prenom[0] ?? ''}${doctor.nom[0] ?? ''}`.toUpperCase();
                    const gradientClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                    const status = getDoctorStatus(doctor);
                    return (
                      <div key={doctor.id} className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                        >
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-[#E2E8F0] truncate">
                            Dr. {doctor.prenom} {doctor.nom}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-[#94A3B8] truncate">
                            {doctor.specialite ?? 'Médecin généraliste'}
                          </p>
                        </div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>

          {/* Col 2: RDV du jour (2/5) */}
          <div className="xl:col-span-2">
            <motion.div
              whileHover={{ y: -1 }}
              className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl shadow-sm p-5 h-full"
            >
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">RDV du jour</h2>
                {todayRdv.length > 0 && (
                  <span className="ml-auto text-xs bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 px-2 py-0.5 rounded-full font-medium">
                    {todayRdv.length}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-14 h-7 bg-slate-200 dark:bg-white/[0.07] rounded-xl flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-3/4 bg-slate-200 dark:bg-white/[0.07] rounded-xl" />
                        <div className="h-2.5 w-1/2 bg-slate-200 dark:bg-white/[0.07] rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : todayRdv.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Calendar className="w-10 h-10 text-slate-200 dark:text-slate-700 mb-3" />
                  <p className="text-sm text-slate-400 dark:text-slate-600">Aucun RDV aujourd'hui</p>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto max-h-64">
                  {todayRdv.map((rdv, idx) => {
                    const colorKey = RDV_COLORS[idx % RDV_COLORS.length];
                    const colorClass = RDV_COLOR_CLASSES[colorKey] ?? RDV_COLOR_CLASSES['sky'];
                    return (
                      <div key={rdv.id} className="flex items-start gap-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-xl flex-shrink-0 ${colorClass}`}>
                          {rdv.heure_debut.slice(0, 5)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-[#E2E8F0] truncate">
                            {rdv.patient_name}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-[#94A3B8] truncate">
                            {rdv.doctor_name}
                            {rdv.type ? ` · ${rdv.type}` : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>

          {/* Col 3: Actions rapides (1/5) */}
          <div className="xl:col-span-1">
            <motion.div
              whileHover={{ y: -1 }}
              className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl shadow-sm p-5 h-full flex flex-col gap-4"
            >
              <h2 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">Actions rapides</h2>

              <button
                onClick={() => onNavigate?.('medecins')}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 rounded-xl text-sm font-medium hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors text-left"
              >
                <UserPlus className="w-4 h-4 flex-shrink-0" />
                <span>Inviter un médecin</span>
              </button>

              <button
                onClick={() => onNavigate?.('patients')}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 rounded-xl text-sm font-medium hover:bg-teal-100 dark:hover:bg-teal-500/20 transition-colors text-left"
              >
                <UserCheck className="w-4 h-4 flex-shrink-0" />
                <span>Ajouter un patient</span>
              </button>

              {/* Interactions alert */}
              <div
                className={`mt-auto rounded-xl p-3 ${
                  interactionsCount > 0
                    ? 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20'
                    : 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${interactionsCount > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
                  <p className={`text-xs font-semibold ${interactionsCount > 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    {interactionsCount > 0 ? `${interactionsCount} interaction(s)` : 'Aucune interaction'}
                  </p>
                </div>
                <p className={`text-xs mt-1 ${interactionsCount > 0 ? 'text-red-500 dark:text-red-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
                  {interactionsCount > 0 ? 'Vérification requise' : 'Aucune détectée'}
                </p>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </PageTransition>
  );
}
