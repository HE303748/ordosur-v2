import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, Plus, X, Loader2, Users } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { PageTransition } from '../../../components/ui/PageTransition';
import type { DoctorWithProfile } from './ClinicMedecinsView';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RendezVous {
  id: string;
  patient_nom: string;
  patient_id: string | null;
  doctor_id: string | null;
  date: string;
  heure_debut: string;
  heure_fin: string;
  motif: string | null;
  type: 'consultation' | 'suivi' | 'urgence' | 'teleconsultation' | 'autre';
  statut: 'confirme' | 'annule' | 'en_attente' | 'termine';
  notes: string | null;
}

type CalView = 'semaine' | 'mois';

// ─── Constants ────────────────────────────────────────────────────────────────

const HOURS   = Array.from({ length: 13 }, (_, i) => i + 8); // 8h–20h
const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const TYPE_LABELS: Record<string, string> = {
  consultation: 'Consultation', suivi: 'Suivi', urgence: 'Urgence',
  teleconsultation: 'Téléconsultation', autre: 'Autre',
};

const DURATIONS = [
  { label: '15 min', value: 15 }, { label: '30 min', value: 30 },
  { label: '45 min', value: 45 }, { label: '1 heure', value: 60 },
];

// Deterministic doctor colors from index
const DOC_COLORS = [
  '#00A86B','#8B5CF6','#10B981','#F59E0B','#EF4444',
  '#EC4899','#00A86B','#84CC16','#F97316','#6366F1',
];

function docColor(idx: number) { return DOC_COLORS[idx % DOC_COLORS.length]; }
function docColorLight(idx: number) {
  const lights = [
    'rgba(14,165,233,0.15)','rgba(139,92,246,0.15)','rgba(16,185,129,0.15)',
    'rgba(245,158,11,0.15)','rgba(239,68,68,0.15)','rgba(236,72,153,0.15)',
    'rgba(6,182,212,0.15)','rgba(132,204,22,0.15)','rgba(249,115,22,0.15)',
    'rgba(99,102,241,0.15)',
  ];
  return lights[idx % lights.length];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(d: Date) { return d.toISOString().split('T')[0]; }
function isSameDay(a: Date, b: Date) { return fmt(a) === fmt(b); }

function getWeekDays(refDate: Date): Date[] {
  const d   = new Date(refDate);
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
  d.setDate(d.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d);
    dd.setDate(d.getDate() + i);
    return dd;
  });
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total  = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// ─── Shared input/label ───────────────────────────────────────────────────────

const inputCls = `w-full px-3 py-2.5 border border-slate-200 dark:border-white/[0.1] rounded-xl text-sm
  bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#E2E8F0]
  placeholder-slate-400 dark:placeholder-slate-600
  focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 dark:focus:ring-[#00A86B]/40 transition-all`;
const labelCls = 'block text-xs font-semibold text-slate-600 dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide';

// ─── New RDV Modal (clinic-specific) ─────────────────────────────────────────

interface RdvModalProps {
  rdv?: RendezVous | null;
  defaultDate?: string;
  doctors: DoctorWithProfile[];
  patients: Array<{ id: string; prenom: string; nom: string }>;
  orgId: string;
  onSave: (data: Partial<RendezVous> & { doctor_id: string }) => Promise<void>;
  onClose: () => void;
}

function RdvModal({ rdv, defaultDate, doctors, patients, onSave, onClose }: RdvModalProps) {
  const [form, setForm] = useState({
    patient_nom:  rdv?.patient_nom  || '',
    patient_id:   rdv?.patient_id   || null as string | null,
    doctor_id:    rdv?.doctor_id    || (doctors[0]?.user_id ?? ''),
    date:         rdv?.date         || defaultDate || fmt(new Date()),
    heure_debut:  rdv?.heure_debut  || '09:00',
    duration:     30,
    type:         rdv?.type         || 'consultation' as RendezVous['type'],
    statut:       rdv?.statut       || 'confirme' as RendezVous['statut'],
    motif:        rdv?.motif        || '',
    notes:        rdv?.notes        || '',
  });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  // When patient is picked from datalist, also set patient_id
  function onPatientInput(val: string) {
    set('patient_nom', val);
    const match = patients.find(p => `${p.prenom} ${p.nom}` === val);
    set('patient_id', match?.id ?? null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.doctor_id) return;
    setSaving(true);
    const heure_fin = addMinutes(form.heure_debut, form.duration);
    await onSave({
      patient_nom: form.patient_nom,
      patient_id:  form.patient_id,
      doctor_id:   form.doctor_id,
      date:        form.date,
      heure_debut: form.heure_debut,
      heure_fin,
      type:        form.type,
      statut:      form.statut,
      motif:       form.motif || null,
      notes:       form.notes || null,
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="relative rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-[#111827] border border-transparent dark:border-white/[0.06]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
          <h2 className="text-lg font-bold text-slate-900 dark:text-[#E2E8F0]">
            {rdv ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/[0.07] rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Patient autocomplete */}
          <div>
            <label className={labelCls}>Patient <span className="text-red-500">*</span></label>
            <input
              value={form.patient_nom}
              onChange={e => onPatientInput(e.target.value)}
              list="clinic-patients-list"
              placeholder="Nom du patient…"
              required
              className={inputCls}
            />
            <datalist id="clinic-patients-list">
              {patients.map(p => (
                <option key={p.id} value={`${p.prenom} ${p.nom}`} />
              ))}
            </datalist>
          </div>

          {/* Doctor selector */}
          <div>
            <label className={labelCls}>Médecin <span className="text-red-500">*</span></label>
            <select
              value={form.doctor_id}
              onChange={e => set('doctor_id', e.target.value)}
              required
              className={`${inputCls} appearance-none`}
            >
              <option value="">Sélectionner un médecin…</option>
              {doctors.map(d => (
                <option key={d.id} value={d.user_id}>
                  Dr. {d.prenom} {d.nom}{d.specialite ? ` — ${d.specialite}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date + Heure + Durée */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Heure</label>
              <input type="time" value={form.heure_debut} onChange={e => set('heure_debut', e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Durée</label>
              <select value={form.duration} onChange={e => set('duration', Number(e.target.value))} className={`${inputCls} appearance-none`}>
                {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          </div>

          {/* Type + Statut */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value as RendezVous['type'])} className={`${inputCls} appearance-none`}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Statut</label>
              <select value={form.statut} onChange={e => set('statut', e.target.value as RendezVous['statut'])} className={`${inputCls} appearance-none`}>
                <option value="confirme">Confirmé</option>
                <option value="en_attente">En attente</option>
                <option value="annule">Annulé</option>
                <option value="termine">Terminé</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Motif</label>
            <input value={form.motif} onChange={e => set('motif', e.target.value)} placeholder="Motif de la consultation…" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Notes préliminaires</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Notes internes…" className={`${inputCls} resize-none`} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-white/[0.1] rounded-xl text-sm font-semibold text-slate-600 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 bg-[#00A86B] hover:bg-[#006B47] text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {rdv ? 'Mettre à jour' : 'Créer le RDV'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({ weekDays, rdvsForDay, today, onAddRdv, onEdit, docColorMap }: {
  weekDays: Date[];
  rdvsForDay: (d: Date) => RendezVous[];
  today: Date;
  onAddRdv: (date: string) => void;
  onEdit: (rdv: RendezVous) => void;
  docColorMap: Map<string, { color: string; colorLight: string }>;
}) {
  return (
    <div className="flex-1 overflow-auto">
      {/* Day header */}
      <div className="grid grid-cols-8 border-b border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#111827] sticky top-0 z-10">
        <div className="border-r border-slate-100 dark:border-white/[0.06] py-3" />
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today);
          return (
            <div key={i} className={`py-3 text-center border-r border-slate-100 dark:border-white/[0.06] last:border-r-0 ${isToday ? 'bg-[#E6F4EE] dark:bg-[#00A86B]/[0.08]' : ''}`}>
              <p className="text-xs text-slate-400 dark:text-[#475569] font-medium">{DAYS_FR[i]}</p>
              <p className={`text-lg font-bold mt-0.5 ${isToday ? 'text-[#00A86B]' : 'text-slate-800 dark:text-[#E2E8F0]'}`}>
                {day.getDate()}
              </p>
              {rdvsForDay(day).length > 0 && (
                <p className="text-[10px] text-[#00A86B] font-semibold">{rdvsForDay(day).length} RDV</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-8">
        {/* Time column */}
        <div className="border-r border-slate-100 dark:border-white/[0.06]">
          {HOURS.map(h => (
            <div key={h} className="h-16 flex items-start px-3 pt-1 border-b border-slate-50 dark:border-white/[0.03]">
              <span className="text-[11px] text-slate-400 dark:text-[#475569] font-medium">{h}:00</span>
            </div>
          ))}
        </div>

        {weekDays.map((day, di) => {
          const dayRdvs = rdvsForDay(day);
          const isToday = isSameDay(day, today);
          return (
            <div
              key={di}
              className={`border-r border-slate-100 dark:border-white/[0.06] last:border-r-0 relative cursor-pointer ${isToday ? 'bg-[#E6F4EE]/20 dark:bg-[#00A86B]/[0.03]' : ''}`}
              onClick={() => onAddRdv(fmt(day))}
            >
              {HOURS.map(h => (
                <div key={h} className="h-16 border-b border-slate-50/80 dark:border-white/[0.02]" />
              ))}
              {dayRdvs.map(rdv => {
                const [sh, sm] = rdv.heure_debut.split(':').map(Number);
                const [eh, em] = rdv.heure_fin.split(':').map(Number);
                const top    = ((sh - 8) * 60 + sm) / 60 * 64;
                const height = Math.max(((eh - sh) * 60 + (em - sm)) / 60 * 64, 24);
                const dc = docColorMap.get(rdv.doctor_id ?? '') ?? { color: '#64748B', colorLight: 'rgba(100,116,139,0.15)' };
                return (
                  <div
                    key={rdv.id}
                    onClick={e => { e.stopPropagation(); onEdit(rdv); }}
                    className="absolute left-0.5 right-0.5 rounded-lg px-1.5 py-1 cursor-pointer hover:opacity-90 transition-opacity shadow-sm border"
                    style={{ top, height, backgroundColor: dc.colorLight, borderColor: dc.color + '60' }}
                  >
                    <p className="text-[10px] font-bold truncate leading-tight" style={{ color: dc.color }}>
                      {rdv.patient_nom}
                    </p>
                    <p className="text-[9px] truncate opacity-70" style={{ color: dc.color }}>
                      {rdv.heure_debut.slice(0, 5)} – {rdv.heure_fin.slice(0, 5)}
                    </p>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({ refDate, rdvsForDay, today, onAddRdv, onEdit, docColorMap }: {
  refDate: Date;
  rdvsForDay: (d: Date) => RendezVous[];
  today: Date;
  onAddRdv: (date: string) => void;
  onEdit: (rdv: RendezVous) => void;
  docColorMap: Map<string, { color: string; colorLight: string }>;
}) {
  const year     = refDate.getFullYear();
  const month    = refDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const days: (Date | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (days.length % 7 !== 0) days.push(null);

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS_FR.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-slate-400 dark:text-[#475569] py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (!day) return <div key={i} />;
          const isToday  = isSameDay(day, today);
          const dayRdvs  = rdvsForDay(day);
          return (
            <div
              key={i}
              onClick={() => onAddRdv(fmt(day))}
              className={`min-h-[90px] rounded-xl p-2 cursor-pointer border transition-all ${
                isToday
                  ? 'bg-[#E6F4EE] dark:bg-[#00A86B]/10 border-[#00A86B] dark:border-[#00A86B]/40'
                  : 'bg-white dark:bg-white/[0.03] border-slate-100 dark:border-white/[0.06] hover:border-[#00A86B]/20 dark:hover:border-[#00A86B]/30'
              }`}
            >
              <p className={`text-xs font-bold mb-1 ${isToday ? 'text-[#00A86B]' : 'text-slate-700 dark:text-[#94A3B8]'}`}>
                {day.getDate()}
              </p>
              <div className="space-y-0.5">
                {dayRdvs.slice(0, 3).map(rdv => {
                  const dc = docColorMap.get(rdv.doctor_id ?? '') ?? { color: '#64748B', colorLight: 'rgba(100,116,139,0.15)' };
                  return (
                    <div
                      key={rdv.id}
                      onClick={e => { e.stopPropagation(); onEdit(rdv); }}
                      className="text-[9px] font-semibold px-1.5 py-0.5 rounded truncate"
                      style={{ backgroundColor: dc.colorLight, color: dc.color }}
                    >
                      {rdv.heure_debut.slice(0,5)} {rdv.patient_nom}
                    </div>
                  );
                })}
                {dayRdvs.length > 3 && (
                  <p className="text-[9px] text-slate-400 dark:text-[#475569] font-medium">+{dayRdvs.length - 3} autres</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ClinicAgendaViewProps {
  orgId?:     string;
  doctors:    DoctorWithProfile[];
  showToast:  (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export function ClinicAgendaView({ orgId, doctors, showToast }: ClinicAgendaViewProps) {
  const [view, setView]               = useState<CalView>('semaine');
  const [refDate, setRefDate]         = useState(new Date());
  const [rdvs, setRdvs]               = useState<RendezVous[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [editingRdv, setEditingRdv]   = useState<RendezVous | null>(null);
  const [clickedDate, setClickedDate] = useState<string | undefined>();
  const [filterDocId, setFilterDocId] = useState<string>('all');
  const [showDocDropdown, setShowDocDropdown] = useState(false);
  const [patients, setPatients]       = useState<Array<{ id: string; prenom: string; nom: string }>>([]);

  const weekDays = getWeekDays(refDate);
  const today    = new Date();

  // Build doctor color map: doctor.user_id → { color, colorLight }
  const docColorMap = new Map(
    doctors.map((d, idx) => [d.user_id, { color: docColor(idx), colorLight: docColorLight(idx) }])
  );

  // Load patients for autocomplete (once)
  useEffect(() => {
    if (!orgId) return;
    supabase.from('patients').select('id, prenom, nom').eq('org_id', orgId).order('nom')
      .then(({ data }) => setPatients(data ?? []));
  }, [orgId]);

  // Load RDVs
  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    let start: string, end: string;
    if (view === 'semaine') {
      start = fmt(weekDays[0]);
      end   = fmt(weekDays[6]);
    } else {
      const y = refDate.getFullYear(), m = refDate.getMonth();
      start = fmt(new Date(y, m, 1));
      end   = fmt(new Date(y, m + 1, 0));
    }

    let q = supabase.from('rendez_vous').select('*')
      .eq('org_id', orgId)
      .gte('date', start).lte('date', end)
      .order('heure_debut');

    if (filterDocId !== 'all') q = q.eq('doctor_id', filterDocId);

    const { data } = await q;
    setRdvs((data ?? []) as RendezVous[]);
    setLoading(false);
  }, [orgId, view, fmt(weekDays[0]), fmt(weekDays[6]), refDate.getMonth(), refDate.getFullYear(), filterDocId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (formData: Partial<RendezVous> & { doctor_id: string }) => {
    if (!orgId) return;
    try {
      if (editingRdv) {
        await supabase.from('rendez_vous').update(formData).eq('id', editingRdv.id);
        showToast('Rendez-vous mis à jour', 'success');
      } else {
        await supabase.from('rendez_vous').insert({ ...formData, org_id: orgId });
        showToast('Rendez-vous créé', 'success');
      }
      setShowModal(false); setEditingRdv(null); load();
    } catch {
      showToast("Erreur lors de l'enregistrement", 'error');
    }
  };

  const navigate = (dir: number) => {
    const d = new Date(refDate);
    if (view === 'semaine') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setRefDate(d);
  };

  const openNew = (date?: string) => {
    setEditingRdv(null); setClickedDate(date); setShowModal(true);
  };

  const rdvsForDay = (day: Date) => rdvs.filter(r => r.date === fmt(day));

  const topLabel = view === 'semaine'
    ? `${weekDays[0].getDate()} – ${weekDays[6].getDate()} ${MONTHS_FR[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`
    : `${MONTHS_FR[refDate.getMonth()]} ${refDate.getFullYear()}`;

  return (
    <PageTransition>
      <div className="flex flex-col h-full overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#111827] flex-shrink-0 flex-wrap">
          {/* Title */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-[#E2E8F0]">Agenda de la clinique</h2>
            <p className="text-slate-500 dark:text-[#94A3B8] text-xs mt-0.5">{topLabel}</p>
          </div>

          {/* Nav */}
          <div className="flex items-center gap-1 ml-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/[0.07] rounded-xl transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-[#94A3B8]" />
            </button>
            <button
              onClick={() => setRefDate(new Date())}
              className="px-3 py-1.5 text-xs font-semibold text-[#00A86B] hover:bg-[#E6F4EE] dark:hover:bg-[#00A86B]/10 rounded-xl transition-colors"
            >
              Aujourd'hui
            </button>
            <button onClick={() => navigate(1)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/[0.07] rounded-xl transition-colors">
              <ChevronRight className="w-4 h-4 text-slate-600 dark:text-[#94A3B8]" />
            </button>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.05] rounded-xl p-1">
            {(['semaine', 'mois'] as CalView[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  view === v
                    ? 'bg-white dark:bg-white/[0.1] text-slate-900 dark:text-[#E2E8F0] shadow-sm'
                    : 'text-slate-500 dark:text-[#94A3B8] hover:text-slate-700'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Doctor filter — premium dropdown */}
          <div className="relative">
            {filterDocId === 'all' ? (
              <button
                onClick={() => setShowDocDropdown(v => !v)}
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl text-xs font-medium text-slate-700 dark:text-[#94A3B8] hover:border-[#00A86B] dark:hover:border-[#00A86B]/40 transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-white/[0.1] flex items-center justify-center flex-shrink-0">
                  <Users className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                </div>
                Tous les médecins
                <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
              </button>
            ) : (() => {
              const selDoc = doctors.find(d => d.user_id === filterDocId);
              const selIdx = doctors.findIndex(d => d.user_id === filterDocId);
              if (!selDoc) return null;
              return (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowDocDropdown(v => !v)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors"
                    style={{
                      backgroundColor: docColorLight(selIdx),
                      borderColor: docColor(selIdx) + '60',
                      color: docColor(selIdx),
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                      style={{ backgroundColor: docColor(selIdx) }}
                    >
                      {selDoc.prenom[0]}{selDoc.nom[0]}
                    </div>
                    Dr. {selDoc.prenom} {selDoc.nom}
                    {selDoc.specialite && (
                      <span className="opacity-60">· {selDoc.specialite.slice(0, 12)}{selDoc.specialite.length > 12 ? '…' : ''}</span>
                    )}
                    <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
                  </button>
                  <button
                    onClick={() => setFilterDocId('all')}
                    title="Tous les médecins"
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/[0.07] rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              );
            })()}

            {/* Backdrop */}
            {showDocDropdown && (
              <div className="fixed inset-0 z-40" onClick={() => setShowDocDropdown(false)} />
            )}

            {/* Dropdown panel */}
            <AnimatePresence>
              {showDocDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-1.5 z-50 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] rounded-xl shadow-2xl overflow-hidden"
                  style={{ minWidth: 230 }}
                >
                  {/* All doctors option */}
                  <button
                    onClick={() => { setFilterDocId('all'); setShowDocDropdown(false); }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors ${
                      filterDocId === 'all'
                        ? 'bg-[#E6F4EE] dark:bg-[#00A86B]/10'
                        : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/[0.1] flex items-center justify-center flex-shrink-0">
                      <Users className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-[#E2E8F0]">
                      Tous les médecins
                    </span>
                    {filterDocId === 'all' && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00A86B] flex-shrink-0" />
                    )}
                  </button>

                  {doctors.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-white/[0.06]" />
                  )}

                  {doctors.map((d, idx) => (
                    <button
                      key={d.id}
                      onClick={() => { setFilterDocId(d.user_id); setShowDocDropdown(false); }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors ${
                        filterDocId === d.user_id
                          ? 'bg-[#E6F4EE] dark:bg-[#00A86B]/10'
                          : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                        style={{ backgroundColor: docColor(idx) }}
                      >
                        {d.prenom[0]}{d.nom[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 dark:text-[#E2E8F0] truncate">
                          Dr. {d.prenom} {d.nom}
                        </p>
                        {d.specialite && (
                          <p className="text-[10px] text-slate-400 dark:text-[#475569] truncate">{d.specialite}</p>
                        )}
                      </div>
                      {filterDocId === d.user_id && (
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: docColor(idx) }} />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* New RDV */}
          <button
            onClick={() => openNew()}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-[#00A86B] hover:bg-[#006B47] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nouveau RDV
          </button>
        </div>

        {/* Calendar body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#00A86B] animate-spin" />
          </div>
        ) : view === 'semaine' ? (
          <WeekView
            weekDays={weekDays} rdvsForDay={rdvsForDay} today={today}
            onAddRdv={openNew}
            onEdit={rdv => { setEditingRdv(rdv); setShowModal(true); }}
            docColorMap={docColorMap}
          />
        ) : (
          <MonthView
            refDate={refDate} rdvsForDay={rdvsForDay} today={today}
            onAddRdv={openNew}
            onEdit={rdv => { setEditingRdv(rdv); setShowModal(true); }}
            docColorMap={docColorMap}
          />
        )}

        {/* Doctor legend — filtered when a doctor is selected */}
        {doctors.length > 0 && (
          <div className="flex items-center gap-4 px-6 py-3 border-t border-slate-100 dark:border-white/[0.06] bg-white dark:bg-[#111827] flex-shrink-0 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 dark:text-[#475569] uppercase tracking-wide">Médecins :</span>
            {doctors
              .filter(d => filterDocId === 'all' || d.user_id === filterDocId)
              .map((d) => {
                const idx = doctors.findIndex(x => x.id === d.id);
                return (
                  <button
                    key={d.id}
                    onClick={() => setFilterDocId(d.user_id === filterDocId ? 'all' : d.user_id)}
                    className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: docColor(idx) }} />
                    <span className={`text-xs ${filterDocId === d.user_id ? 'font-semibold text-slate-900 dark:text-[#E2E8F0]' : 'text-slate-600 dark:text-[#94A3B8]'}`}>
                      Dr. {d.prenom} {d.nom}
                    </span>
                  </button>
                );
              })}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && orgId && (
          <RdvModal
            rdv={editingRdv}
            defaultDate={clickedDate}
            doctors={doctors}
            patients={patients}
            orgId={orgId}
            onSave={handleSave}
            onClose={() => { setShowModal(false); setEditingRdv(null); }}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
