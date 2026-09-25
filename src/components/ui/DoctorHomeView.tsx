import { type ComponentType, type ReactNode } from 'react';
import {
  Users, FileText, ShieldCheck, AlertTriangle, BarChart3, CalendarDays,
  ChevronRight, Plus, UserPlus, ShieldPlus, Zap, ArrowRight,
} from 'lucide-react';
import type { Patient } from '../../lib/supabase';
import { formatAge } from '../../lib/ageUtils';
import type { ViewType } from './Sidebar';
import { PageTransition } from './PageTransition';
import { PatientAvatar } from './PatientAvatar';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HomeStats {
  totalPatients: number;
  ordonnances: number;
  interactions: number;
  evolution: number;
  evolutionInsufficient: boolean;
  evolutionReason: 'new_account' | 'low_volume' | null;
  patientsThisMonth: number;
  patientsLastMonth: number;
  // null = non calculable de façon exacte (fenêtre de lignes insuffisante) → rien affiché
  ordThisMonth: number | null;
  ordLastMonth: number | null;
  intThisMonth: number | null;
  intLastMonth: number | null;
  graves: number | null;
  gravesScope: 'total' | 'month' | null;
}

export interface HomeAlert {
  id: string;
  patient_id: string | null;
  medicament_a: string;
  medicament_b: string;
  risk_level: string;
  timestamp: string;
}

export interface HomeRdv {
  id: string;
  date: string;
  heure_debut: string;
  heure_fin: string | null;
  patient_nom: string | null;
  motif: string | null;
  type: string | null;
}

interface DoctorHomeViewProps {
  doctorNom: string;
  stats: HomeStats;
  statsLoading: boolean;
  patients: Patient[];
  patientsLoading: boolean;
  recentAlerts: HomeAlert[];
  todayRdvs: HomeRdv[];
  todayRdvsRemaining: number; // RDV à venir aujourd'hui au-delà des 5 affichés
  onNavigate: (v: ViewType) => void;
  onOpenPatient: (id: string) => void;
  onOpenAgenda: (date?: string) => void;
  onAddPatient: () => void;
  onNewPrescription: () => void;
}

// ─── Constantes d'affichage ──────────────────────────────────────────────────

const ROW_H = 'h-16'; // hauteur commune lignes + skeletons (aucun décalage au chargement)
const LIST_MIN_H = 'min-h-[320px]'; // 5 lignes × 64px

const CARD = 'bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm';
const FOCUS = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#060D1A]';

const TYPE_LABELS: Record<string, string> = {
  consultation: 'Consultation',
  suivi: 'Suivi',
  urgence: 'Urgence',
  teleconsultation: 'Téléconsultation',
  autre: 'Rendez-vous',
};

function greeting(): string {
  const h = new Date().getHours();
  return h >= 18 || h < 5 ? 'Bonsoir' : 'Bonjour';
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (days === 0) return `Aujourd'hui, ${time}`;
  if (days === 1) return `Hier, ${time}`;
  if (days < 7) return `Il y a ${days} jours`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}

function riskBadge(level: string): { label: string; cls: string } {
  if (level === 'dangerous') return { label: 'Grave', cls: 'bg-red-50 text-[#DC2626] ring-1 ring-inset ring-red-200 dark:bg-[#DC2626]/[0.12] dark:ring-[#DC2626]/30' };
  if (level === 'attention') return { label: 'Modérée', cls: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-white/[0.06] dark:text-[#CBD5E1] dark:ring-white/10' };
  return { label: 'Faible', cls: 'bg-[#E6F4EE] text-[#006B47] ring-1 ring-inset ring-[#00A86B]/20 dark:bg-[#00A86B]/[0.12] dark:text-[#00A86B]' };
}

// ─── Briques UI ──────────────────────────────────────────────────────────────

function Skel({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200/80 dark:bg-white/[0.06] rounded-lg ${className || ''}`} />;
}

type Tone = 'positive' | 'danger' | 'neutral';
const TONE: Record<Tone, string> = {
  positive: 'text-[#00A86B]',
  danger: 'text-[#DC2626]',
  neutral: 'text-slate-500 dark:text-[#94A3B8]',
};

interface Kpi {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  iconDanger?: boolean;
  details: Array<{ text: string; tone: Tone }>;
  target: ViewType;
  ariaTarget: string;
}

function KpiCard({ kpi, onClick }: { kpi: Kpi; onClick: () => void }) {
  const Icon = kpi.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${kpi.label} : ${kpi.value}. ${kpi.ariaTarget}`}
      className={`${CARD} ${FOCUS} group w-full text-left p-4 lg:p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-slate-300/80 dark:hover:border-white/[0.12] hover:-translate-y-0.5 active:translate-y-0`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          kpi.iconDanger ? 'bg-red-50 dark:bg-[#DC2626]/[0.12]' : 'bg-[#E6F4EE] dark:bg-[#00A86B]/[0.12]'
        }`}>
          <Icon className={`w-5 h-5 ${kpi.iconDanger ? 'text-[#DC2626]' : 'text-[#00A86B]'}`} />
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-[#00A86B] group-hover:translate-x-0.5 transition-all" aria-hidden />
      </div>
      <p className="h-9 text-2xl lg:text-3xl font-bold text-[#0A1628] dark:text-[#E2E8F0] tabular-nums leading-9">{kpi.value}</p>
      <p className="h-5 mt-1 text-sm font-semibold text-slate-700 dark:text-[#CBD5E1] truncate">{kpi.label}</p>
      <div className="mt-1 min-h-[2rem] space-y-0.5">
        {kpi.details.map((d, i) => (
          <p key={i} className={`text-xs leading-4 ${TONE[d.tone]}`}>{d.text}</p>
        ))}
      </div>
    </button>
  );
}

function KpiSkeleton() {
  return (
    <div className={`${CARD} p-4 lg:p-5`} aria-hidden>
      <Skel className="w-10 h-10 rounded-xl mb-3" />
      <Skel className="w-16 h-9" />
      <Skel className="w-28 h-5 mt-1" />
      <div className="mt-1.5 min-h-[2rem] space-y-1.5">
        <Skel className="w-32 h-3" />
        <Skel className="w-24 h-3" />
      </div>
    </div>
  );
}

function Block({ title, icon: Icon, action, children, className = '' }: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${CARD} overflow-hidden flex flex-col ${className}`} aria-label={title}>
      <div className="flex items-center justify-between gap-3 px-4 lg:px-5 h-14 border-b border-slate-100 dark:border-white/[0.06]">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#0A1628] dark:text-[#E2E8F0]">
          <Icon className="w-4 h-4 text-slate-400 dark:text-[#64748B]" aria-hidden />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function LinkButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${FOCUS} inline-flex items-center gap-1 text-sm font-semibold text-[#00A86B] hover:text-[#006B47] rounded-md px-1 -mx-1 transition-colors`}
    >
      {children}
      <ArrowRight className="w-3.5 h-3.5" aria-hidden />
    </button>
  );
}

function RowSkeleton() {
  return (
    <div className={`${ROW_H} flex items-center gap-3 px-4 lg:px-5`} aria-hidden>
      <Skel className="w-9 h-9 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skel className="w-40 h-3.5" />
        <Skel className="w-24 h-3" />
      </div>
    </div>
  );
}

function Empty({ icon: Icon, title, text, cta, onCta }: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  text: string;
  cta?: string;
  onCta?: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10">
      <div className="w-12 h-12 rounded-2xl bg-[#E6F4EE] dark:bg-[#00A86B]/[0.12] flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-[#00A86B]" />
      </div>
      <p className="text-sm font-semibold text-[#0A1628] dark:text-[#E2E8F0]">{title}</p>
      <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-1 max-w-xs">{text}</p>
      {cta && onCta && (
        <button
          type="button"
          onClick={onCta}
          className={`${FOCUS} mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#00A86B] hover:bg-[#006B47] text-white rounded-xl text-sm font-semibold transition-colors`}
        >
          <Plus className="w-4 h-4" aria-hidden />
          {cta}
        </button>
      )}
    </div>
  );
}

const ROW_BTN = `${ROW_H} ${FOCUS} focus-visible:ring-inset focus-visible:ring-offset-0 w-full flex items-center gap-3 px-4 lg:px-5 text-left hover:bg-slate-50 dark:hover:bg-white/[0.04] active:bg-slate-100 dark:active:bg-white/[0.06] transition-colors group`;

// ─── Vue ─────────────────────────────────────────────────────────────────────

export function DoctorHomeView({
  doctorNom, stats, statsLoading, patients, patientsLoading, recentAlerts,
  todayRdvs, todayRdvsRemaining, onNavigate, onOpenPatient, onOpenAgenda,
  onAddPatient, onNewPrescription,
}: DoctorHomeViewProps) {
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const patientName = new Map(patients.map(p => [p.id, `${p.prenom} ${p.nom}`.trim()]));

  // ── KPI (tout provient de la base ; variation affichée seulement si calculable) ──
  const patientsDetails: Kpi['details'] = stats.totalPatients === 0
    ? [{ text: 'Ajoutez votre premier patient', tone: 'neutral' }]
    : stats.patientsThisMonth > 0
    ? [{ text: `+${stats.patientsThisMonth} ce mois-ci`, tone: 'positive' }]
    : [{ text: 'Aucun nouveau patient ce mois-ci', tone: 'neutral' }];

  const ordDetails: Kpi['details'] = [];
  if (stats.ordonnances === 0) {
    ordDetails.push({ text: 'Aucune ordonnance pour le moment', tone: 'neutral' });
  } else if (stats.ordThisMonth !== null && stats.ordLastMonth !== null) {
    const delta = stats.ordThisMonth - stats.ordLastMonth;
    ordDetails.push({ text: `${stats.ordThisMonth} ce mois-ci`, tone: 'neutral' });
    ordDetails.push({ text: `${signed(delta)} vs mois précédent`, tone: delta > 0 ? 'positive' : 'neutral' });
  }

  const intDetails: Kpi['details'] = [];
  if (stats.interactions === 0) {
    intDetails.push({ text: 'Aucune alerte enregistrée', tone: 'positive' });
  } else {
    if (stats.graves !== null) {
      const g = stats.graves;
      const scope = stats.gravesScope === 'month' ? ' ce mois-ci' : '';
      intDetails.push({
        text: g === 0 ? `Aucune grave${scope}` : `dont ${g} grave${g > 1 ? 's' : ''}${scope}`,
        tone: g > 0 ? 'danger' : 'positive',
      });
    }
    if (stats.intThisMonth !== null && stats.intLastMonth !== null) {
      intDetails.push({ text: `${stats.intThisMonth} ce mois-ci · ${signed(stats.intThisMonth - stats.intLastMonth)} vs mois préc.`, tone: 'neutral' });
    }
  }

  const evoValue = stats.evolutionInsufficient || stats.evolution === 0
    ? '—'
    : stats.evolution >= 9999
    ? `+${stats.patientsThisMonth}`
    : `${signed(stats.evolution)} %`;
  const evoDetails: Kpi['details'] = stats.evolutionReason === 'new_account'
    ? [{ text: 'Cabinet en démarrage', tone: 'neutral' }]
    : stats.evolutionReason === 'low_volume'
    ? [{ text: 'Pas encore assez de données', tone: 'neutral' }]
    : [
        { text: `${stats.patientsThisMonth} nouveaux ce mois-ci`, tone: stats.evolution > 0 ? 'positive' : 'neutral' },
        { text: `${stats.patientsLastMonth} le mois précédent`, tone: 'neutral' },
      ];

  const kpis: Kpi[] = [
    {
      label: 'Patients totaux', value: String(stats.totalPatients), icon: Users,
      details: patientsDetails, target: 'patients', ariaTarget: 'Ouvrir la liste des patients',
    },
    {
      label: 'Ordonnances', value: String(stats.ordonnances), icon: FileText,
      details: ordDetails, target: 'ordonnances', ariaTarget: 'Ouvrir les ordonnances',
    },
    {
      label: 'Interactions', value: String(stats.interactions),
      icon: (stats.graves ?? 0) > 0 ? AlertTriangle : ShieldCheck,
      iconDanger: (stats.graves ?? 0) > 0,
      details: intDetails, target: 'checker', ariaTarget: 'Ouvrir le vérificateur',
    },
    {
      label: 'Évolution patients', value: evoValue, icon: BarChart3,
      details: evoDetails, target: 'stats', ariaTarget: 'Ouvrir les statistiques',
    },
  ];

  return (
    <PageTransition>
      <div className="px-4 py-5 lg:p-6 max-w-[1400px] space-y-5 lg:space-y-6">
        {/* 1. En-tête */}
        <header>
          <h1 className="text-xl lg:text-2xl font-bold text-[#0A1628] dark:text-[#E2E8F0] tracking-tight">
            {greeting()}{doctorNom ? `, Dr ${doctorNom}` : ''}
          </h1>
          <p className="text-slate-500 dark:text-[#94A3B8] mt-0.5 text-sm first-letter:uppercase">{today}</p>
        </header>

        {/* 2. KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
          {statsLoading
            ? Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
            : kpis.map(kpi => <KpiCard key={kpi.label} kpi={kpi} onClick={() => onNavigate(kpi.target)} />)}
        </div>

        {/* 3. Votre journée + 4. Actions rapides */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
          <Block
            title="Votre journée"
            icon={CalendarDays}
            className="lg:col-span-2"
            action={<LinkButton onClick={() => onOpenAgenda()}>Agenda</LinkButton>}
          >
            <div className={`${LIST_MIN_H} flex flex-col divide-y divide-slate-100 dark:divide-white/[0.04]`}>
              {statsLoading
                ? Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
                : todayRdvs.length === 0
                ? (
                  <Empty
                    icon={CalendarDays}
                    title="Aucun rendez-vous à venir aujourd'hui"
                    text="Votre agenda est libre pour le reste de la journée."
                    cta="Planifier un rendez-vous"
                    onCta={() => onOpenAgenda()}
                  />
                )
                : (
                  <>
                    {todayRdvs.map(r => (
                      <button key={r.id} type="button" onClick={() => onOpenAgenda(r.date)} className={ROW_BTN}
                        aria-label={`Rendez-vous à ${r.heure_debut.slice(0, 5)} avec ${r.patient_nom || 'patient'} — ouvrir l'agenda`}>
                        <div className="w-14 flex-shrink-0">
                          <p className="text-sm font-bold text-[#0A1628] dark:text-[#E2E8F0] tabular-nums">{r.heure_debut.slice(0, 5)}</p>
                          {r.heure_fin && <p className="text-[11px] text-slate-400 dark:text-[#64748B] tabular-nums">{r.heure_fin.slice(0, 5)}</p>}
                        </div>
                        <div className="w-px h-8 bg-[#00A86B]/40 flex-shrink-0" aria-hidden />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#0A1628] dark:text-[#E2E8F0] truncate group-hover:text-[#006B47] dark:group-hover:text-[#00A86B] transition-colors">
                            {r.patient_nom || 'Patient non renseigné'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-[#94A3B8] truncate">
                            {r.motif || TYPE_LABELS[r.type ?? ''] || 'Rendez-vous'}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-[#00A86B] flex-shrink-0 transition-colors" aria-hidden />
                      </button>
                    ))}
                    {todayRdvsRemaining > 0 && (
                      <button type="button" onClick={() => onOpenAgenda(todayRdvs[0].date)}
                        className={`${FOCUS} focus-visible:ring-inset h-11 w-full text-sm font-semibold text-[#00A86B] hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors`}>
                        + {todayRdvsRemaining} autre{todayRdvsRemaining > 1 ? 's' : ''} aujourd'hui
                      </button>
                    )}
                  </>
                )}
            </div>
          </Block>

          <Block title="Actions rapides" icon={Zap}>
            <div className="p-4 lg:p-5 space-y-2.5">
              {[
                { label: 'Nouvelle ordonnance', hint: 'Choisir un patient et prescrire', icon: FileText, onClick: onNewPrescription, primary: true },
                { label: 'Nouveau patient', hint: 'Créer une fiche patient', icon: UserPlus, onClick: onAddPatient },
                { label: 'Vérifier une prescription', hint: 'Interactions et contre-indications', icon: ShieldPlus, onClick: () => onNavigate('checker') },
              ].map(a => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.label}
                    type="button"
                    onClick={a.onClick}
                    className={`${FOCUS} group w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all ${
                      a.primary
                        ? 'bg-[#00A86B] hover:bg-[#006B47] text-white shadow-sm'
                        : 'bg-slate-50 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.07] text-[#0A1628] dark:text-[#E2E8F0]'
                    }`}
                  >
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      a.primary ? 'bg-white/15' : 'bg-white dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.06]'
                    }`}>
                      <Icon className={`w-[18px] h-[18px] ${a.primary ? 'text-white' : 'text-[#00A86B]'}`} aria-hidden />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold">{a.label}</span>
                      <span className={`block text-xs truncate ${a.primary ? 'text-white/80' : 'text-slate-500 dark:text-[#94A3B8]'}`}>{a.hint}</span>
                    </span>
                    <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5 ${a.primary ? 'text-white/80' : 'text-slate-300 dark:text-slate-600'}`} aria-hidden />
                  </button>
                );
              })}
            </div>
          </Block>
        </div>

        {/* 5. Patients récents + 6. Dernières alertes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
          <Block
            title="Patients récents"
            icon={Users}
            action={patients.length > 0 ? <LinkButton onClick={() => onNavigate('patients')}>Tous</LinkButton> : undefined}
          >
            <div className={`${LIST_MIN_H} flex flex-col divide-y divide-slate-100 dark:divide-white/[0.04]`}>
              {patientsLoading
                ? Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
                : patients.length === 0
                ? (
                  <Empty
                    icon={Users}
                    title="Aucun patient pour l'instant"
                    text="Créez une première fiche pour vérifier vos prescriptions sur son profil."
                    cta="Ajouter un patient"
                    onCta={onAddPatient}
                  />
                )
                : patients.slice(0, 5).map(p => {
                  const patho = p.pathologies?.find(x => x && x !== 'Aucune pathologie renseignée');
                  const age = p.date_naissance ? formatAge(p.date_naissance) : null;
                  const meta = [patho, age].filter(Boolean).join(' · ');
                  return (
                    <button key={p.id} type="button" onClick={() => onOpenPatient(p.id)} className={ROW_BTN}
                      aria-label={`Ouvrir la fiche de ${p.prenom} ${p.nom}`}>
                      <PatientAvatar name={`${p.prenom} ${p.nom}`} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0A1628] dark:text-[#E2E8F0] truncate group-hover:text-[#006B47] dark:group-hover:text-[#00A86B] transition-colors">
                          {p.prenom} {p.nom}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8] truncate">
                          {meta || <span className="italic text-slate-400 dark:text-[#64748B]">Aucune pathologie renseignée</span>}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-[#00A86B] flex-shrink-0 transition-colors" aria-hidden />
                    </button>
                  );
                })}
            </div>
          </Block>

          <Block
            title="Dernières alertes"
            icon={AlertTriangle}
            action={recentAlerts.length > 0 ? <LinkButton onClick={() => onNavigate('checker')}>Vérificateur</LinkButton> : undefined}
          >
            <div className={`${LIST_MIN_H} flex flex-col divide-y divide-slate-100 dark:divide-white/[0.04]`}>
              {statsLoading
                ? Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
                : recentAlerts.length === 0
                ? (
                  <Empty
                    icon={ShieldCheck}
                    title="Aucune alerte enregistrée"
                    text="Les interactions détectées lors de vos prescriptions apparaîtront ici."
                    cta="Vérifier une prescription"
                    onCta={() => onNavigate('checker')}
                  />
                )
                : recentAlerts.map(a => {
                  const badge = riskBadge(a.risk_level);
                  const meds = a.medicament_a === a.medicament_b ? a.medicament_a : `${a.medicament_a} + ${a.medicament_b}`;
                  const who = (a.patient_id && patientName.get(a.patient_id)) || 'Patient';
                  return (
                    <button key={a.id} type="button" onClick={() => onNavigate('checker')} className={ROW_BTN}
                      aria-label={`Alerte ${badge.label.toLowerCase()} : ${meds}, ${who}. Ouvrir le vérificateur`}>
                      <span className={`w-[72px] flex-shrink-0 inline-flex justify-center px-2 py-1 rounded-md text-[11px] font-semibold ${badge.cls}`}>
                        {badge.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0A1628] dark:text-[#E2E8F0] truncate">{meds}</p>
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8] truncate">{who} · {relativeDate(a.timestamp)}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-[#00A86B] flex-shrink-0 transition-colors" aria-hidden />
                    </button>
                  );
                })}
            </div>
          </Block>
        </div>
      </div>
    </PageTransition>
  );
}
