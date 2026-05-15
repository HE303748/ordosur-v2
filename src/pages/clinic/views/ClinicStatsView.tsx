import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts';
import {
  FileText, Users, TrendingUp, Activity, Download,
  TrendingDown, Minus, AlertTriangle, Pill, UserCheck,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { PageTransition } from '../../../components/ui/PageTransition';
import { supabase } from '../../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DoctorWithProfile {
  id: string;
  user_id: string;
  rpps: string | null;
  specialite: string | null;
  prenom: string;
  nom: string;
  email: string;
}

type PeriodType = 'month' | '3months' | '6months' | 'year';

interface PeriodDates {
  start:     Date;
  end:       Date;
  prevStart: Date;
  prevEnd:   Date;
}

interface KpiValue { current: number; prev: number; }

interface ConsChartPoint  { label: string; consultations: number; }
interface DocChartPoint   { name: string; ordonnances: number; }
interface PathChartPoint  { name: string; value: number; }
interface GrowthPoint     { mois: string; patients: number; cumul: number; }

interface TopDoctorRow {
  name: string; specialite: string;
  patients: number; ordonnances: number; interactions: number;
}

interface MedicamentRow {
  nom: string; dci: string; count: number; mainDoctor: string;
}

interface SurveillanceRow {
  patient: string; medecin: string; date: string;
  medicaments: string; alerte: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PIE_COLORS = [
  '#00A86B','#8b5cf6','#10b981','#f59e0b',
  '#ef4444','#ec4899','#00A86B','#f97316',
];

const DOC_COLORS = [
  '#00A86B','#8b5cf6','#10b981','#f59e0b',
  '#ef4444','#ec4899','#00A86B','#84cc16','#f97316','#6366f1',
];

const CHART_STYLE = {
  label:   { fill: '#94a3b8', fontSize: 11 },
  tooltip: {
    backgroundColor: '#1e293b',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 12,
  },
};

const PERIOD_OPTIONS: { key: PeriodType; label: string }[] = [
  { key: 'month',   label: 'Ce mois'           },
  { key: '3months', label: '3 derniers mois'   },
  { key: '6months', label: '6 derniers mois'   },
  { key: 'year',    label: 'Cette année'        },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPeriodDates(period: PeriodType): PeriodDates {
  const now = new Date();
  let start: Date, prevStart: Date, prevEnd: Date;
  const end = new Date(now);

  switch (period) {
    case 'month': {
      start     = new Date(now.getFullYear(), now.getMonth(), 1);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      break;
    }
    case '3months': {
      start     = new Date(now); start.setMonth(start.getMonth() - 3);
      prevStart = new Date(start); prevStart.setMonth(prevStart.getMonth() - 3);
      prevEnd   = new Date(start); prevEnd.setDate(prevEnd.getDate() - 1);
      break;
    }
    case '6months': {
      start     = new Date(now); start.setMonth(start.getMonth() - 6);
      prevStart = new Date(start); prevStart.setMonth(prevStart.getMonth() - 6);
      prevEnd   = new Date(start); prevEnd.setDate(prevEnd.getDate() - 1);
      break;
    }
    case 'year': {
      start     = new Date(now.getFullYear(), 0, 1);
      prevStart = new Date(now.getFullYear() - 1, 0, 1);
      prevEnd   = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
      break;
    }
  }
  return { start, end, prevStart, prevEnd };
}

function trendInfo(current: number, prev: number): { pct: number; up: boolean; neutral: boolean } {
  if (prev === 0 && current === 0) return { pct: 0, up: true, neutral: true };
  if (prev === 0) return { pct: 100, up: true, neutral: false };
  const pct = ((current - prev) / prev) * 100;
  return { pct: Math.abs(Math.round(pct)), up: pct >= 0, neutral: Math.abs(pct) < 1 };
}

function buildWeekBuckets(start: Date, end: Date): { from: Date; to: Date; label: string }[] {
  const buckets: { from: Date; to: Date; label: string }[] = [];
  const cur = new Date(start);
  // rewind to Monday
  const day = cur.getDay();
  cur.setDate(cur.getDate() - ((day + 6) % 7));
  cur.setHours(0, 0, 0, 0);
  while (cur <= end) {
    const from = new Date(cur);
    const to   = new Date(cur); to.setDate(to.getDate() + 6); to.setHours(23, 59, 59, 999);
    buckets.push({
      from, to,
      label: `${from.getDate()}/${from.getMonth() + 1}`,
    });
    cur.setDate(cur.getDate() + 7);
  }
  return buckets;
}

function buildMonthBuckets(start: Date, end: Date): { year: number; month: number; label: string }[] {
  const buckets: { year: number; month: number; label: string }[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) {
    buckets.push({
      year:  cur.getFullYear(),
      month: cur.getMonth(),
      label: cur.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return buckets;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, color, trend, sub,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  trend?: { pct: number; up: boolean; neutral: boolean };
  sub?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-5 shadow-sm"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && !trend.neutral && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
            trend.up
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
              : 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
          }`}>
            {trend.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.pct}%
          </div>
        )}
        {trend?.neutral && (
          <div className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 dark:bg-white/[0.05] dark:text-slate-400">
            <Minus className="w-3 h-3" /> —
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-[#E2E8F0]">{value}</p>
      <p className="text-sm font-medium text-slate-600 dark:text-[#94A3B8] mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-[#475569] mt-0.5">{sub}</p>}
    </motion.div>
  );
}

function KpiSkeleton() {
  return (
    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/[0.07]" />
        <div className="w-14 h-5 rounded-full bg-slate-200 dark:bg-white/[0.07]" />
      </div>
      <div className="h-8 w-16 bg-slate-200 dark:bg-white/[0.07] rounded mb-2" />
      <div className="h-4 w-32 bg-slate-200 dark:bg-white/[0.07] rounded" />
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-5 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800 dark:text-[#E2E8F0] mb-4">{title}</h3>
      {children}
    </div>
  );
}

function ChartSkeleton() {
  return <div className="h-52 bg-slate-100 dark:bg-white/[0.04] rounded-xl animate-pulse" />;
}

function TableCard({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
        <Icon className="w-4 h-4 text-[#00A86B]" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-[#E2E8F0]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props { orgId?: string; doctors: DoctorWithProfile[]; }

// ─── Component ────────────────────────────────────────────────────────────────

export function ClinicStatsView({ orgId, doctors }: Props) {
  const [period,       setPeriod]       = useState<PeriodType>('month');
  const [loading,      setLoading]      = useState(true);
  const [pdfLoading,   setPdfLoading]   = useState(false);

  // KPIs
  const [kpiCons,      setKpiCons]      = useState<KpiValue>({ current: 0, prev: 0 });
  const [kpiPat,       setKpiPat]       = useState<KpiValue>({ current: 0, prev: 0 });
  const [kpiOrds,      setKpiOrds]      = useState<KpiValue>({ current: 0, prev: 0 });
  const [kpiOccup,     setKpiOccup]     = useState<KpiValue>({ current: 0, prev: 0 });

  // Charts
  const [consChart,    setConsChart]    = useState<ConsChartPoint[]>([]);
  const [docChart,     setDocChart]     = useState<DocChartPoint[]>([]);
  const [pathChart,    setPathChart]    = useState<PathChartPoint[]>([]);
  const [growthChart,  setGrowthChart]  = useState<GrowthPoint[]>([]);

  // Tables
  const [topDoctors,   setTopDoctors]   = useState<TopDoctorRow[]>([]);
  const [topMeds,      setTopMeds]      = useState<MedicamentRow[]>([]);
  const [surveillance, setSurveillance] = useState<SurveillanceRow[]>([]);

  // ── Load all data ──────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);

    try {
      const { start, end, prevStart, prevEnd } = getPeriodDates(period);
      const startD = start.toISOString().slice(0, 10);
      const endD   = end.toISOString().slice(0, 10);
      const prevSD = prevStart.toISOString().slice(0, 10);
      const prevED = prevEnd.toISOString().slice(0, 10);

      const [
        consRes, prevConsRes,
        patRes, prevPatRes,
        ordsRes, prevOrdsRes,
        rdvRes, prevRdvRes,
        allPatsRes,
      ] = await Promise.all([
        supabase.from('consultations')
          .select('patient_id, doctor_id, date')
          .eq('org_id', orgId).gte('date', startD).lte('date', endD),
        supabase.from('consultations')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId).gte('date', prevSD).lte('date', prevED),

        supabase.from('patients')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
        supabase.from('patients')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .gte('created_at', prevStart.toISOString()).lte('created_at', prevEnd.toISOString()),

        supabase.from('ordonnances')
          .select('id, doctor_id, patient_id, date, created_at')
          .eq('org_id', orgId)
          .gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
        supabase.from('ordonnances')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .gte('created_at', prevStart.toISOString()).lte('created_at', prevEnd.toISOString()),

        supabase.from('rendez_vous')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId).gte('date', startD).lte('date', endD),
        supabase.from('rendez_vous')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId).gte('date', prevSD).lte('date', prevED),

        supabase.from('patients')
          .select('id, prenom, nom, pathologies, allergies_medicaments')
          .eq('org_id', orgId),
      ]);

      const cons  = consRes.data  ?? [];
      const ords  = ordsRes.data  ?? [];
      const allPats = allPatsRes.data ?? [];

      // ── KPIs ───────────────────────────────────────────────────────────────
      setKpiCons({ current: cons.length, prev: prevConsRes.count ?? 0 });
      setKpiPat({ current: patRes.count ?? 0, prev: prevPatRes.count ?? 0 });
      setKpiOrds({ current: ords.length, prev: prevOrdsRes.count ?? 0 });

      // Taux occupation: RDV / (médecins × jours ouvrés × 8 créneaux)
      const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
      const workDays = Math.round(diffDays * 5 / 7);
      const slots    = doctors.length * workDays * 8;
      const rdvCur   = rdvRes.count ?? 0;
      const rdvPrev  = prevRdvRes.count ?? 0;
      const occCur   = slots > 0 ? Math.min(Math.round((rdvCur  / slots) * 100), 100) : 0;
      const occPrev  = slots > 0 ? Math.min(Math.round((rdvPrev / slots) * 100), 100) : 0;
      setKpiOccup({ current: occCur, prev: occPrev });

      // ── Consultations chart ────────────────────────────────────────────────
      if (period === 'year' || period === '6months') {
        const buckets = buildMonthBuckets(start, end);
        const map = new Map(buckets.map(b => [`${b.year}-${b.month}`, 0]));
        for (const c of cons) {
          const d = new Date(c.date);
          const k = `${d.getFullYear()}-${d.getMonth()}`;
          map.set(k, (map.get(k) ?? 0) + 1);
        }
        setConsChart(buckets.map(b => ({
          label: b.label,
          consultations: map.get(`${b.year}-${b.month}`) ?? 0,
        })));
      } else {
        const buckets = buildWeekBuckets(start, end);
        setConsChart(buckets.map(b => ({
          label: b.label,
          consultations: cons.filter(c => {
            const d = new Date(c.date);
            return d >= b.from && d <= b.to;
          }).length,
        })));
      }

      // ── Doctor chart ───────────────────────────────────────────────────────
      const ordsByDoc = new Map<string, number>();
      for (const o of ords) {
        ordsByDoc.set(o.doctor_id, (ordsByDoc.get(o.doctor_id) ?? 0) + 1);
      }
      const docChartData = doctors.map((d, idx) => ({
        name: `Dr. ${d.prenom} ${d.nom}`,
        ordonnances: ordsByDoc.get(d.user_id) ?? 0,
        color: DOC_COLORS[idx % DOC_COLORS.length],
      })).sort((a, b) => b.ordonnances - a.ordonnances);
      setDocChart(docChartData);

      // ── Pathologies pie ────────────────────────────────────────────────────
      const pathMap = new Map<string, number>();
      for (const p of allPats) {
        for (const path of (p.pathologies ?? [])) {
          const key = path.trim().toLowerCase();
          const display = path.trim();
          pathMap.set(display, (pathMap.get(display) ?? 0) + 1);
        }
      }
      const pathSorted = Array.from(pathMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, value]) => ({ name, value }));
      setPathChart(pathSorted);

      // ── Patient growth chart (last 6 months, independent of period) ────────
      const growthBuckets = buildMonthBuckets(
        (() => { const d = new Date(); d.setMonth(d.getMonth() - 5); return new Date(d.getFullYear(), d.getMonth(), 1); })(),
        new Date()
      );
      const growthCounts = await Promise.all(
        growthBuckets.map(async b => {
          const ms = new Date(b.year, b.month, 1).toISOString();
          const me = new Date(b.year, b.month + 1, 0, 23, 59, 59).toISOString();
          const { count } = await supabase
            .from('patients').select('id', { count: 'exact', head: true })
            .eq('org_id', orgId).gte('created_at', ms).lte('created_at', me);
          return count ?? 0;
        })
      );
      let cumul = 0;
      setGrowthChart(growthBuckets.map((b, i) => {
        cumul += growthCounts[i];
        return { mois: b.label, patients: growthCounts[i], cumul };
      }));

      // ── Top doctors table ──────────────────────────────────────────────────
      const consByDoc = new Map<string, Set<string>>();
      for (const c of cons) {
        if (!consByDoc.has(c.doctor_id)) consByDoc.set(c.doctor_id, new Set());
        consByDoc.get(c.doctor_id)!.add(c.patient_id);
      }
      const topDocRows: TopDoctorRow[] = doctors.map(d => ({
        name: `Dr. ${d.prenom} ${d.nom}`,
        specialite: d.specialite ?? 'Généraliste',
        patients: consByDoc.get(d.user_id)?.size ?? 0,
        ordonnances: ordsByDoc.get(d.user_id) ?? 0,
        interactions: 0,
      })).sort((a, b) => b.ordonnances - a.ordonnances).slice(0, 5);
      setTopDoctors(topDocRows);

      // ── Top medications table ──────────────────────────────────────────────
      if (ords.length > 0) {
        const ordIds = ords.map(o => o.id);
        // Batch to avoid URL too long
        const CHUNK = 100;
        const allLignes: Array<{ medicament_nom: string; ordonnance_id: string }> = [];
        for (let i = 0; i < ordIds.length; i += CHUNK) {
          const { data: lignes } = await supabase
            .from('ordonnance_lignes')
            .select('medicament_nom, ordonnance_id')
            .in('ordonnance_id', ordIds.slice(i, i + CHUNK));
          if (lignes) allLignes.push(...lignes);
        }
        const medMap = new Map<string, { count: number; ordIds: Set<string> }>();
        for (const l of allLignes) {
          const key = l.medicament_nom?.trim() ?? 'Inconnu';
          if (!medMap.has(key)) medMap.set(key, { count: 0, ordIds: new Set() });
          medMap.get(key)!.count++;
          medMap.get(key)!.ordIds.add(l.ordonnance_id);
        }
        const docByOrdId = new Map<string, string>();
        const docNameByUserId = new Map(doctors.map(d => [d.user_id, `Dr. ${d.prenom} ${d.nom}`]));
        for (const o of ords) docByOrdId.set(o.id, docNameByUserId.get(o.doctor_id) ?? '—');

        const medsRows: MedicamentRow[] = Array.from(medMap.entries())
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 10)
          .map(([nom, data]) => {
            // Find most frequent doctor
            const docCount = new Map<string, number>();
            for (const ordId of data.ordIds) {
              const dn = docByOrdId.get(ordId) ?? '—';
              docCount.set(dn, (docCount.get(dn) ?? 0) + 1);
            }
            const mainDoctor = Array.from(docCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
            return { nom, dci: '', count: data.count, mainDoctor };
          });
        setTopMeds(medsRows);
      } else {
        setTopMeds([]);
      }

      // ── Surveillance table (ordonnances for patients with allergies, this month) ──
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const { data: recentOrds } = await supabase
        .from('ordonnances')
        .select('id, patient_id, doctor_id, date, created_at')
        .eq('org_id', orgId)
        .gte('created_at', monthStart.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (recentOrds && recentOrds.length > 0) {
        const patIds = [...new Set(recentOrds.map(o => o.patient_id))];
        const { data: surPats } = await supabase
          .from('patients')
          .select('id, prenom, nom, allergies_medicaments, pathologies')
          .in('id', patIds);

        const surPatMap = new Map((surPats ?? []).map(p => [p.id, p]));
        const docNameByUid = new Map(doctors.map(d => [d.user_id, `Dr. ${d.prenom} ${d.nom}`]));

        // Get ordonnance lignes for surveillance
        const surOrdIds = recentOrds.map(o => o.id);
        const { data: surLignes } = await supabase
          .from('ordonnance_lignes')
          .select('ordonnance_id, medicament_nom')
          .in('ordonnance_id', surOrdIds.slice(0, 100));
        const lignesByOrd = new Map<string, string[]>();
        for (const l of (surLignes ?? [])) {
          if (!lignesByOrd.has(l.ordonnance_id)) lignesByOrd.set(l.ordonnance_id, []);
          lignesByOrd.get(l.ordonnance_id)!.push(l.medicament_nom);
        }

        const rows: SurveillanceRow[] = [];
        for (const o of recentOrds) {
          const pat = surPatMap.get(o.patient_id);
          if (!pat) continue;
          const hasAllergies = (pat.allergies_medicaments ?? []).length > 0;
          const isHighRisk   = (pat.pathologies ?? []).length >= 3;
          if (!hasAllergies && !isHighRisk) continue;

          const meds = (lignesByOrd.get(o.id) ?? []).join(', ') || '—';
          const alerte = hasAllergies
            ? `Allergie connue à: ${(pat.allergies_medicaments ?? []).slice(0,2).join(', ')}`
            : `${(pat.pathologies ?? []).length} pathologies chroniques`;

          rows.push({
            patient: `${pat.prenom} ${pat.nom}`,
            medecin: docNameByUid.get(o.doctor_id) ?? '—',
            date: new Date(o.date || o.created_at).toLocaleDateString('fr-FR'),
            medicaments: meds,
            alerte,
          });
          if (rows.length >= 10) break;
        }
        setSurveillance(rows);
      } else {
        setSurveillance([]);
      }

    } catch (err) {
      console.error('[ClinicStatsView] load error:', err);
    } finally {
      setLoading(false);
    }
  }, [orgId, period, doctors]);

  useEffect(() => { load(); }, [load]);

  // ── PDF generation ─────────────────────────────────────────────────────────

  async function generatePDF() {
    setPdfLoading(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210;
      const M = 20;
      let y = M;

      const periodLabel = PERIOD_OPTIONS.find(p => p.key === period)?.label ?? period;
      const reportNum   = `RP-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

      // ── En-tête ──────────────────────────────────────────────────────────
      doc.setFillColor(14, 165, 233);
      doc.rect(0, 0, W, 28, 'F');
      doc.setFontSize(20);
      doc.setTextColor(255, 255, 255);
      doc.text('Ordosur', M, 12);
      doc.setFontSize(10);
      doc.text(`Rapport clinique · ${periodLabel}`, M, 20);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} · ${reportNum}`, W - M, 20, { align: 'right' });

      y = 38;

      // ── Section 1 : KPIs ─────────────────────────────────────────────────
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text('1. Chiffres clés de la période', M, y);
      y += 7;

      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);

      const kpis = [
        { label: 'Consultations',       value: kpiCons.current },
        { label: 'Nouveaux patients',   value: kpiPat.current  },
        { label: 'Ordonnances générées', value: kpiOrds.current },
        { label: "Taux d'occupation",   value: `${kpiOccup.current}%` },
      ];

      const colW = (W - M * 2) / 4;
      kpis.forEach((k, i) => {
        const x = M + i * colW;
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, y, colW - 3, 18, 2, 2, 'F');
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text(String(k.value), x + (colW - 3) / 2, y + 10, { align: 'center' });
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(k.label, x + (colW - 3) / 2, y + 16, { align: 'center' });
      });
      y += 26;

      // ── Section 2 : Médecins actifs ──────────────────────────────────────
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text('2. Médecins actifs', M, y);
      y += 7;

      doc.setFillColor(241, 245, 249);
      doc.rect(M, y, W - M * 2, 6, 'F');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      const tCols = [M + 2, M + 60, M + 110, M + 140, M + 165];
      ['Médecin', 'Spécialité', 'Patients', 'Ordonnances', 'Interactions'].forEach((h, i) => {
        doc.text(h, tCols[i], y + 4);
      });
      y += 7;

      topDoctors.forEach((d, i) => {
        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(M, y - 1, W - M * 2, 6, 'F');
        }
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(d.name,            tCols[0], y + 4);
        doc.text(d.specialite,      tCols[1], y + 4);
        doc.text(String(d.patients),     tCols[2], y + 4);
        doc.text(String(d.ordonnances),  tCols[3], y + 4);
        doc.text(String(d.interactions), tCols[4], y + 4);
        y += 6;
      });
      y += 5;

      // ── Section 3 : Top 10 médicaments ──────────────────────────────────
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text('3. Top 10 médicaments prescrits', M, y);
      y += 7;

      doc.setFillColor(241, 245, 249);
      doc.rect(M, y, W - M * 2, 6, 'F');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      ['Médicament', 'Nb prescriptions', 'Médecin principal'].forEach((h, i) => {
        doc.text(h, [M + 2, M + 100, M + 135][i], y + 4);
      });
      y += 7;

      topMeds.slice(0, 10).forEach((m, i) => {
        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(M, y - 1, W - M * 2, 6, 'F');
        }
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(m.nom.slice(0, 45),         M + 2,   y + 4);
        doc.text(String(m.count),            M + 100, y + 4);
        doc.text(m.mainDoctor.slice(0, 35),  M + 135, y + 4);
        y += 6;
      });
      y += 5;

      // Check if we need a new page
      if (y > 230) { doc.addPage(); y = M; }

      // ── Section 4 : Patients à risque ───────────────────────────────────
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text('4. Patients sous surveillance', M, y);
      y += 7;

      if (surveillance.length === 0) {
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('Aucune ordonnance à surveiller ce mois.', M, y);
        y += 8;
      } else {
        doc.setFillColor(241, 245, 249);
        doc.rect(M, y, W - M * 2, 6, 'F');
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        ['Patient', 'Médecin', 'Date', 'Alerte'].forEach((h, i) => {
          doc.text(h, [M + 2, M + 55, M + 95, M + 120][i], y + 4);
        });
        y += 7;

        surveillance.slice(0, 8).forEach((s, i) => {
          if (y > 265) return;
          if (i % 2 === 0) {
            doc.setFillColor(254, 242, 242);
            doc.rect(M, y - 1, W - M * 2, 6, 'F');
          }
          doc.setFontSize(8);
          doc.setTextColor(15, 23, 42);
          doc.text(s.patient.slice(0, 20),  M + 2,   y + 4);
          doc.text(s.medecin.slice(0, 18),  M + 55,  y + 4);
          doc.text(s.date,                  M + 95,  y + 4);
          doc.text(s.alerte.slice(0, 40),   M + 120, y + 4);
          y += 6;
        });
      }

      // ── Pied de page ─────────────────────────────────────────────────────
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(226, 232, 240);
        doc.line(M, 285, W - M, 285);
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Ordosur · ${reportNum} · Page ${i}/${pageCount} · ${new Date().toLocaleDateString('fr-FR')}`,
          W / 2, 291, { align: 'center' }
        );
      }

      doc.save(`rapport_${period}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('[ClinicStatsView] PDF error:', err);
    } finally {
      setPdfLoading(false);
    }
  }

  // ── Trend helpers ──────────────────────────────────────────────────────────
  const trCons  = trendInfo(kpiCons.current,  kpiCons.prev);
  const trPat   = trendInfo(kpiPat.current,   kpiPat.prev);
  const trOrds  = trendInfo(kpiOrds.current,  kpiOrds.prev);
  const trOccup = trendInfo(kpiOccup.current, kpiOccup.prev);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <PageTransition>
      <div className="p-6 max-w-[1500px] space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-[#E2E8F0]">
              Statistiques de la clinique
            </h1>
            <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-0.5">
              Analyses et indicateurs de performance
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Period selector */}
            <div className="flex items-center bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] rounded-xl p-1 gap-1">
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setPeriod(opt.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    period === opt.key
                      ? 'bg-[#00A86B] text-white shadow-sm'
                      : 'text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {/* PDF button */}
            <button
              onClick={generatePDF}
              disabled={loading || pdfLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#00A86B] hover:bg-[#006B47] rounded-xl transition-colors disabled:opacity-60 shadow-sm"
            >
              {pdfLoading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Download className="w-4 h-4" />}
              Télécharger rapport PDF
            </button>
          </div>
        </div>

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (<>
            <KpiCard
              icon={Activity}   label="Consultations totales"  value={kpiCons.current}
              color="bg-[#E6F4EE] dark:bg-[#00A86B]/10 text-[#00A86B]"
              trend={trCons}
              sub={`Période précédente : ${kpiCons.prev}`}
            />
            <KpiCard
              icon={Users}      label="Nouveaux patients"      value={kpiPat.current}
              color="bg-[#E6F4EE] dark:bg-[#00A86B]/10 text-[#006B47] dark:text-[#00A86B]"
              trend={trPat}
              sub={`Période précédente : ${kpiPat.prev}`}
            />
            <KpiCard
              icon={FileText}   label="Ordonnances générées"   value={kpiOrds.current}
              color="bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400"
              trend={trOrds}
              sub={`Période précédente : ${kpiOrds.prev}`}
            />
            <KpiCard
              icon={TrendingUp} label="Taux d'occupation"      value={`${kpiOccup.current}%`}
              color="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
              trend={trOccup}
              sub="RDV / créneaux disponibles"
            />
          </>)}
        </div>

        {/* ── Charts Row 1 : Line + Bar ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ChartCard title="Consultations par semaine / mois">
            {loading ? <ChartSkeleton /> : consChart.length === 0 || consChart.every(c => c.consultations === 0) ? (
              <p className="text-center text-sm text-slate-400 dark:text-slate-600 py-16">Aucune donnée</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={consChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                  <XAxis dataKey="label" tick={CHART_STYLE.label} axisLine={false} tickLine={false} />
                  <YAxis tick={CHART_STYLE.label} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={CHART_STYLE.tooltip} />
                  <Line type="monotone" dataKey="consultations" stroke="#00A86B" strokeWidth={2.5}
                    dot={{ fill: '#00A86B', r: 4 }} name="Consultations" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Performance par médecin">
            {loading ? <ChartSkeleton /> : docChart.length === 0 ? (
              <p className="text-center text-sm text-slate-400 dark:text-slate-600 py-16">Aucun médecin</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={docChart} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" horizontal={false} />
                  <XAxis type="number" tick={CHART_STYLE.label} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={CHART_STYLE.label} axisLine={false} tickLine={false} width={110} />
                  <Tooltip contentStyle={CHART_STYLE.tooltip} />
                  <Bar dataKey="ordonnances" radius={[0, 6, 6, 0]} name="Ordonnances">
                    {docChart.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* ── Charts Row 2 : Pie + Area ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ChartCard title="Pathologies les plus fréquentes">
            {loading ? <ChartSkeleton /> : pathChart.length === 0 ? (
              <p className="text-center text-sm text-slate-400 dark:text-slate-600 py-16">Aucune donnée</p>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={pathChart} cx="42%" cy="50%"
                    outerRadius={80} dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={true}
                  >
                    {pathChart.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_STYLE.tooltip} />
                  <Legend
                    layout="vertical" align="right" verticalAlign="middle"
                    formatter={(value) => (
                      <span style={{ color: '#94a3b8', fontSize: 11 }}>
                        {String(value).slice(0, 18)}{String(value).length > 18 ? '…' : ''}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Croissance patients (6 derniers mois)">
            {loading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={growthChart}>
                  <defs>
                    <linearGradient id="gradSky" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#00A86B" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#00A86B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                  <XAxis dataKey="mois" tick={CHART_STYLE.label} axisLine={false} tickLine={false} />
                  <YAxis tick={CHART_STYLE.label} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={CHART_STYLE.tooltip} />
                  <Area type="monotone" dataKey="patients" stroke="#00A86B" strokeWidth={2.5}
                    fill="url(#gradSky)" name="Nouveaux patients" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* ── Tables Row ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* Table 1 — Top 5 médecins */}
          <TableCard title="Top 5 médecins actifs" icon={UserCheck}>
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 bg-slate-100 dark:bg-white/[0.04] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : topDoctors.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-600 text-center py-8">Aucun médecin</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50/60 dark:bg-white/[0.02]">
                      {['Médecin','Spécialité','Patients','Ordo.'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 dark:text-[#475569] uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topDoctors.map((d, i) => (
                      <tr key={i} className="border-t border-slate-50 dark:border-white/[0.04] hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-[#E2E8F0] whitespace-nowrap">{d.name}</td>
                        <td className="px-4 py-2.5 text-slate-500 dark:text-[#94A3B8] whitespace-nowrap">{d.specialite.slice(0,14)}{d.specialite.length>14?'…':''}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="font-bold text-[#00A86B]">{d.patients}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="font-bold text-violet-600 dark:text-violet-400">{d.ordonnances}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TableCard>

          {/* Table 2 — Médicaments les plus prescrits */}
          <TableCard title="Médicaments les plus prescrits" icon={Pill}>
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 bg-slate-100 dark:bg-white/[0.04] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : topMeds.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-600 text-center py-8">Aucune donnée</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50/60 dark:bg-white/[0.02]">
                      {['Médicament','Prescriptions','Médecin'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 dark:text-[#475569] uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topMeds.map((m, i) => (
                      <tr key={i} className="border-t border-slate-50 dark:border-white/[0.04] hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-[#E2E8F0]">
                          {m.nom.slice(0, 20)}{m.nom.length > 20 ? '…' : ''}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-5 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 rounded font-bold">
                            {m.count}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 dark:text-[#94A3B8] whitespace-nowrap">
                          {m.mainDoctor.slice(0, 14)}{m.mainDoctor.length > 14 ? '…' : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TableCard>

          {/* Table 3 — Ordonnances à surveiller */}
          <TableCard title="Ordonnances à surveiller" icon={AlertTriangle}>
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 bg-slate-100 dark:bg-white/[0.04] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : surveillance.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-center px-4">
                <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-sm text-slate-400 dark:text-slate-600">Aucune ordonnance à surveiller</p>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[320px]">
                {surveillance.map((s, i) => (
                  <div key={i} className="px-4 py-3 border-t border-slate-50 dark:border-white/[0.04] first:border-0 hover:bg-red-50/30 dark:hover:bg-red-500/[0.04] transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-[#E2E8F0]">{s.patient}</p>
                        <p className="text-[10px] text-slate-400 dark:text-[#475569] mt-0.5">{s.medecin} · {s.date}</p>
                      </div>
                    </div>
                    <p className="text-[10px] mt-1 text-red-500 dark:text-red-400 leading-snug">
                      ⚠ {s.alerte}
                    </p>
                    {s.medicaments !== '—' && (
                      <p className="text-[10px] text-slate-400 dark:text-[#475569] mt-0.5 truncate">
                        💊 {s.medicaments}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TableCard>

        </div>
      </div>
    </PageTransition>
  );
}
