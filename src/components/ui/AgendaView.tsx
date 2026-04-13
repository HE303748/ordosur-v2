import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Plus, Clock, User,
  Calendar, X, Check, AlertCircle, Phone,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PageTransition } from './PageTransition';

/* ── Types ─────────────────────────────────────────────────────── */
interface RendezVous {
  id: string;
  patient_nom: string;
  patient_id?: string | null;
  date: string;
  heure_debut: string;
  heure_fin: string;
  motif?: string;
  type: 'consultation' | 'suivi' | 'urgence' | 'teleconsultation' | 'autre';
  statut: 'confirme' | 'annule' | 'en_attente' | 'termine';
  notes?: string;
  couleur?: string;
}

type CalView = 'semaine' | 'jour' | 'mois';

const TYPE_COLORS: Record<string, string> = {
  consultation:    'bg-sky-500',
  suivi:           'bg-violet-500',
  urgence:         'bg-red-500',
  teleconsultation:'bg-emerald-500',
  autre:           'bg-slate-500',
};

const TYPE_LABELS: Record<string, string> = {
  consultation:    'Consultation',
  suivi:           'Suivi',
  urgence:         'Urgence',
  teleconsultation:'Téléconsultation',
  autre:           'Autre',
};

const STATUT_COLORS: Record<string, string> = {
  confirme:   'bg-emerald-100 text-emerald-800',
  annule:     'bg-red-100 text-red-800',
  en_attente: 'bg-amber-100 text-amber-800',
  termine:    'bg-slate-100 text-slate-600',
};

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7h → 20h
const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function getWeekDays(refDate: Date): Date[] {
  const d = new Date(refDate);
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1;
  d.setDate(d.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d);
    dd.setDate(d.getDate() + i);
    return dd;
  });
}

function fmt(d: Date) {
  return d.toISOString().split('T')[0];
}

function isSameDay(a: Date, b: Date) {
  return fmt(a) === fmt(b);
}

/* ── New RDV Modal ──────────────────────────────────────────────── */
interface RdvModalProps {
  rdv?: RendezVous | null;
  defaultDate?: string;
  onSave: (data: Partial<RendezVous>) => Promise<void>;
  onClose: () => void;
  patients: Array<{ id: string; prenom: string; nom: string }>;
}

function RdvModal({ rdv, defaultDate, onSave, onClose, patients }: RdvModalProps) {
  const [form, setForm] = useState<Partial<RendezVous>>({
    patient_nom: rdv?.patient_nom || '',
    date: rdv?.date || defaultDate || fmt(new Date()),
    heure_debut: rdv?.heure_debut || '09:00',
    heure_fin: rdv?.heure_fin || '09:30',
    motif: rdv?.motif || '',
    type: rdv?.type || 'consultation',
    statut: rdv?.statut || 'confirme',
    notes: rdv?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof RendezVous, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.96, y: 10  }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">
            {rdv ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Patient */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Patient</label>
            <div className="relative">
              <input
                value={form.patient_nom}
                onChange={e => set('patient_nom', e.target.value)}
                list="patients-list"
                placeholder="Nom du patient..."
                required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
              <datalist id="patients-list">
                {patients.map(p => (
                  <option key={p.id} value={`${p.prenom} ${p.nom}`} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Date + Heures */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Début</label>
              <input
                type="time"
                value={form.heure_debut}
                onChange={e => set('heure_debut', e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Fin</label>
              <input
                type="time"
                value={form.heure_fin}
                onChange={e => set('heure_fin', e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
            </div>
          </div>

          {/* Type + Statut */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Type</label>
              <select
                value={form.type}
                onChange={e => set('type', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
              >
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Statut</label>
              <select
                value={form.statut}
                onChange={e => set('statut', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
              >
                <option value="confirme">Confirmé</option>
                <option value="en_attente">En attente</option>
                <option value="annule">Annulé</option>
                <option value="termine">Terminé</option>
              </select>
            </div>
          </div>

          {/* Motif */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Motif</label>
            <input
              value={form.motif}
              onChange={e => set('motif', e.target.value)}
              placeholder="Motif de la consultation..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              placeholder="Notes internes..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {saving ? 'Enregistrement...' : rdv ? 'Mettre à jour' : 'Créer le RDV'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ── Main AgendaView ────────────────────────────────────────────── */
interface AgendaViewProps {
  patients: Array<{ id: string; prenom: string; nom: string }>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export function AgendaView({ patients, showToast }: AgendaViewProps) {
  const { user } = useAuth();
  const [view, setView] = useState<CalView>('semaine');
  const [refDate, setRefDate] = useState(new Date());
  const [rdvs, setRdvs] = useState<RendezVous[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRdv, setEditingRdv] = useState<RendezVous | null>(null);
  const [clickedDate, setClickedDate] = useState<string | undefined>();

  const weekDays = getWeekDays(refDate);
  const today = new Date();

  /* Load RDVs */
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const start = fmt(weekDays[0]);
    const end = fmt(weekDays[6]);
    const { data } = await supabase
      .from('rendez_vous')
      .select('*')
      .eq('org_id', user.org_id)
      .gte('date', start)
      .lte('date', end)
      .order('heure_debut');
    setRdvs(data || []);
    setLoading(false);
  }, [user, fmt(weekDays[0])]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (formData: Partial<RendezVous>) => {
    if (!user) return;
    try {
      if (editingRdv) {
        await supabase.from('rendez_vous').update(formData).eq('id', editingRdv.id);
        showToast('Rendez-vous mis à jour', 'success');
      } else {
        await supabase.from('rendez_vous').insert({ ...formData, org_id: user.org_id, doctor_id: user.id });
        showToast('Rendez-vous créé', 'success');
      }
      setShowModal(false);
      setEditingRdv(null);
      load();
    } catch {
      showToast('Erreur lors de l\'enregistrement', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce rendez-vous ?')) return;
    await supabase.from('rendez_vous').delete().eq('id', id);
    showToast('Rendez-vous supprimé', 'info');
    load();
  };

  const openNew = (date?: string) => {
    setEditingRdv(null);
    setClickedDate(date);
    setShowModal(true);
  };

  const navigate = (dir: number) => {
    const d = new Date(refDate);
    if (view === 'semaine') d.setDate(d.getDate() + dir * 7);
    else if (view === 'jour') d.setDate(d.getDate() + dir);
    else d.setMonth(d.getMonth() + dir);
    setRefDate(d);
  };

  const rdvsForDay = (day: Date) => rdvs.filter(r => r.date === fmt(day));

  const topLabel = view === 'semaine'
    ? `${weekDays[0].getDate()} – ${weekDays[6].getDate()} ${MONTHS_FR[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`
    : view === 'jour'
    ? refDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : `${MONTHS_FR[refDate.getMonth()]} ${refDate.getFullYear()}`;

  return (
    <PageTransition>
      <div className="flex flex-col h-full">
        {/* ── Toolbar ── */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 bg-white flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Agenda</h2>
            <p className="text-slate-500 text-xs mt-0.5">{topLabel}</p>
          </div>

          <div className="flex items-center gap-1 ml-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <button
              onClick={() => setRefDate(new Date())}
              className="px-3 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-50 rounded-xl transition-colors"
            >
              Aujourd'hui
            </button>
            <button onClick={() => navigate(1)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          <div className="flex items-center gap-1 ml-2 bg-slate-100 rounded-xl p-1">
            {(['semaine','jour','mois'] as CalView[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <button
            onClick={() => openNew()}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nouveau RDV
          </button>
        </div>

        {/* ── Calendar body ── */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : view === 'semaine' ? (
          <WeekView weekDays={weekDays} rdvsForDay={rdvsForDay} today={today} onAddRdv={openNew}
            onEdit={rdv => { setEditingRdv(rdv); setShowModal(true); }} onDelete={handleDelete} />
        ) : view === 'jour' ? (
          <DayView day={refDate} rdvs={rdvsForDay(refDate)} today={today} onAddRdv={openNew}
            onEdit={rdv => { setEditingRdv(rdv); setShowModal(true); }} onDelete={handleDelete} />
        ) : (
          <MonthView refDate={refDate} rdvsForDay={rdvsForDay} today={today} weekDays={weekDays}
            onAddRdv={openNew} onEdit={rdv => { setEditingRdv(rdv); setShowModal(true); }} />
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <RdvModal
            rdv={editingRdv}
            defaultDate={clickedDate}
            onSave={handleSave}
            onClose={() => { setShowModal(false); setEditingRdv(null); }}
            patients={patients}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  );
}

/* ── Week View ──────────────────────────────────────────────────── */
function WeekView({ weekDays, rdvsForDay, today, onAddRdv, onEdit, onDelete }: any) {
  return (
    <div className="flex-1 overflow-auto">
      {/* Day headers */}
      <div className="grid grid-cols-8 border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="border-r border-slate-100 py-3" />
        {weekDays.map((day: Date, i: number) => {
          const isToday = isSameDay(day, today);
          return (
            <div key={i} className={`py-3 text-center border-r border-slate-100 ${isToday ? 'bg-sky-50' : ''}`}>
              <p className="text-xs text-slate-400 font-medium">{DAYS_FR[i]}</p>
              <p className={`text-lg font-bold mt-0.5 ${isToday ? 'text-sky-600' : 'text-slate-800'}`}>
                {day.getDate()}
              </p>
              {rdvsForDay(day).length > 0 && (
                <p className="text-[10px] text-sky-500 font-semibold">{rdvsForDay(day).length} RDV</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="grid grid-cols-8">
        {/* Hours column */}
        <div className="border-r border-slate-100">
          {HOURS.map(h => (
            <div key={h} className="h-16 flex items-start px-3 pt-1 border-b border-slate-50">
              <span className="text-[11px] text-slate-400 font-medium">{h}:00</span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDays.map((day: Date, di: number) => {
          const dayRdvs = rdvsForDay(day);
          const isToday = isSameDay(day, today);
          return (
            <div
              key={di}
              className={`border-r border-slate-100 relative cursor-pointer ${isToday ? 'bg-sky-50/30' : ''}`}
              onClick={() => onAddRdv(fmt(day))}
            >
              {HOURS.map(h => (
                <div key={h} className="h-16 border-b border-slate-50/80" />
              ))}
              {dayRdvs.map((rdv: RendezVous) => {
                const [sh, sm] = rdv.heure_debut.split(':').map(Number);
                const [eh, em] = rdv.heure_fin.split(':').map(Number);
                const top = ((sh - 7) * 60 + sm) / 60 * 64;
                const height = Math.max(((eh - sh) * 60 + (em - sm)) / 60 * 64, 28);
                const color = TYPE_COLORS[rdv.type] || 'bg-sky-500';
                return (
                  <div
                    key={rdv.id}
                    onClick={e => { e.stopPropagation(); onEdit(rdv); }}
                    className={`absolute left-0.5 right-0.5 ${color} rounded-lg px-2 py-1 cursor-pointer hover:opacity-90 transition-opacity shadow-sm`}
                    style={{ top, height }}
                  >
                    <p className="text-white text-[10px] font-bold truncate leading-tight">{rdv.patient_nom}</p>
                    <p className="text-white/80 text-[9px] truncate">{rdv.heure_debut.slice(0,5)} – {rdv.heure_fin.slice(0,5)}</p>
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

/* ── Day View ───────────────────────────────────────────────────── */
function DayView({ day, rdvs, today, onAddRdv, onEdit, onDelete }: any) {
  const isToday = isSameDay(day, today);
  return (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-[80px_1fr]">
        <div className="border-r border-slate-100">
          {HOURS.map(h => (
            <div key={h} className="h-20 flex items-start px-3 pt-1 border-b border-slate-50">
              <span className="text-[11px] text-slate-400 font-medium">{h}:00</span>
            </div>
          ))}
        </div>
        <div className={`relative cursor-pointer ${isToday ? 'bg-sky-50/20' : ''}`} onClick={() => onAddRdv(fmt(day))}>
          {HOURS.map(h => (<div key={h} className="h-20 border-b border-slate-100" />))}
          {rdvs.map((rdv: RendezVous) => {
            const [sh, sm] = rdv.heure_debut.split(':').map(Number);
            const [eh, em] = rdv.heure_fin.split(':').map(Number);
            const top = ((sh - 7) * 60 + sm) / 60 * 80;
            const height = Math.max(((eh - sh) * 60 + (em - sm)) / 60 * 80, 40);
            const color = TYPE_COLORS[rdv.type] || 'bg-sky-500';
            return (
              <div
                key={rdv.id}
                onClick={e => { e.stopPropagation(); onEdit(rdv); }}
                className={`absolute left-2 right-2 ${color} rounded-xl px-3 py-2 cursor-pointer hover:opacity-90 transition-opacity shadow-md`}
                style={{ top, height }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-bold truncate">{rdv.patient_nom}</p>
                    <p className="text-white/80 text-xs mt-0.5">{rdv.heure_debut.slice(0,5)} – {rdv.heure_fin.slice(0,5)}</p>
                    {rdv.motif && <p className="text-white/70 text-xs mt-0.5 truncate">{rdv.motif}</p>}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${STATUT_COLORS[rdv.statut]}`}>
                    {rdv.statut === 'confirme' ? '✓' : rdv.statut === 'annule' ? '✕' : '⏳'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Month View ─────────────────────────────────────────────────── */
function MonthView({ refDate, rdvsForDay, today, onAddRdv, onEdit }: any) {
  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1);
  const days: (Date | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (days.length % 7 !== 0) days.push(null);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS_FR.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (!day) return <div key={i} />;
          const isToday = isSameDay(day, today);
          const dayRdvs = rdvsForDay(day);
          return (
            <div
              key={i}
              onClick={() => onAddRdv(fmt(day))}
              className={`min-h-[90px] rounded-xl p-2 cursor-pointer border transition-colors ${
                isToday
                  ? 'bg-sky-50 border-sky-300'
                  : 'bg-white border-slate-100 hover:border-sky-200 hover:bg-sky-50/30'
              }`}
            >
              <p className={`text-xs font-bold mb-1 ${isToday ? 'text-sky-600' : 'text-slate-700'}`}>
                {day.getDate()}
              </p>
              <div className="space-y-0.5">
                {dayRdvs.slice(0, 3).map((rdv: RendezVous) => (
                  <div
                    key={rdv.id}
                    onClick={e => { e.stopPropagation(); onEdit(rdv); }}
                    className={`${TYPE_COLORS[rdv.type]} text-white text-[9px] font-semibold px-1.5 py-0.5 rounded truncate`}
                  >
                    {rdv.heure_debut.slice(0,5)} {rdv.patient_nom}
                  </div>
                ))}
                {dayRdvs.length > 3 && (
                  <p className="text-[9px] text-slate-400 font-medium">+{dayRdvs.length - 3} autres</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
