import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatFr } from '../../lib/examRequest';
import { formatNombre, type ChartSerie } from '../../lib/resultatsLogic';

// Sprint 6A — Courbe d'un examen dans le temps. Recharts n'est chargé qu'à l'ouverture
// d'une courbe (import() dans BilansSection) : il ne pèse pas sur le bundle initial.

export interface ChartInput { label: string; serie: ChartSerie }

interface Row { t: number; date: string; a?: number; b?: number; idA?: string; idB?: string }

// Trait principal : couleur du texte courant (Ink Navy en clair, clair en mode sombre).
const INK = 'currentColor';
const GREEN = '#00A86B';
const SLATE = '#64748B';

const tick = (t: number) => {
  const d = new Date(t);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCFullYear()).slice(2)}`;
};

interface DotProps { cx?: number; cy?: number; payload?: Row; index?: number }

export default function BilanChart({ primary, secondary, selectedId, onPoint }: {
  primary: ChartInput;
  /** Second examen sur le même graphique (axe de droite). */
  secondary?: ChartInput | null;
  selectedId?: string | null;
  onPoint?: (resultatId: string) => void;
}) {
  const data = useMemo(() => {
    const byT = new Map<number, Row>();
    for (const p of primary.serie.points) byT.set(p.t, { ...(byT.get(p.t) ?? { t: p.t, date: p.date }), a: p.valeur, idA: p.id });
    for (const p of secondary?.serie.points ?? []) byT.set(p.t, { ...(byT.get(p.t) ?? { t: p.t, date: p.date }), b: p.valeur, idB: p.id });
    return [...byT.values()].sort((x, y) => x.t - y.t);
  }, [primary, secondary]);

  const bande = primary.serie.bande;
  const dot = (which: 'a' | 'b', color: string) => (props: DotProps) => {
    const { cx, cy, payload, index } = props;
    const id = which === 'a' ? payload?.idA : payload?.idB;
    if (cx === undefined || cy === undefined || !id || payload?.[which] === undefined) return <g key={`${which}-${index}`} />;
    const sel = id === selectedId;
    return (
      <circle key={`${which}-${id}`} cx={cx} cy={cy} r={sel ? 6.5 : 4.5} fill={sel ? color : '#fff'} stroke={color} strokeWidth={2}
        style={{ cursor: onPoint ? 'pointer' : 'default' }} onClick={() => onPoint?.(id)}>
        <title>{`${formatFr(payload!.date)} : ${formatNombre(payload![which])}`}</title>
      </circle>
    );
  };

  const unitA = primary.serie.unite ?? '';
  const unitB = secondary?.serie.unite ?? '';

  return (
    <div className="w-full h-56 sm:h-64 text-[#0A1628] dark:text-[#E2E8F0]" role="img"
      aria-label={`Courbe ${primary.label}${secondary ? ` et ${secondary.label}` : ''} : ${primary.serie.points.length} résultat${primary.serie.points.length > 1 ? 's' : ''}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: secondary ? 4 : 12, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="#94A3B8" strokeOpacity={0.2} vertical={false} />
          <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={tick} tick={{ fontSize: 11, fill: SLATE }}
            tickLine={false} axisLine={{ stroke: '#94A3B8', strokeOpacity: 0.4 }} padding={{ left: 14, right: 14 }} minTickGap={28} />
          <YAxis yAxisId="a" tick={{ fontSize: 11, fill: SLATE }} tickLine={false} axisLine={false} width={46} domain={['auto', 'auto']}
            tickFormatter={(v: number) => formatNombre(v, 2)} />
          {secondary && (
            <YAxis yAxisId="b" orientation="right" tick={{ fontSize: 11, fill: SLATE }} tickLine={false} axisLine={false} width={46} domain={['auto', 'auto']}
              tickFormatter={(v: number) => formatNombre(v, 2)} />
          )}
          {/* Bande = bornes du laboratoire saisies avec le résultat le plus récent (jamais une norme interne). */}
          {bande && bande.basse !== null && bande.haute !== null && (
            <ReferenceArea yAxisId="a" y1={bande.basse} y2={bande.haute} fill={GREEN} fillOpacity={0.1} stroke="none" ifOverflow="extendDomain" />
          )}
          {bande && (bande.basse === null) !== (bande.haute === null) && (
            <ReferenceLine yAxisId="a" y={(bande.basse ?? bande.haute)!} stroke={GREEN} strokeDasharray="4 4" strokeOpacity={0.7} ifOverflow="extendDomain" />
          )}
          <Tooltip
            formatter={(value: number | string, name: string) => [`${formatNombre(Number(value))} ${name === 'a' ? unitA : unitB}`.trim(), name === 'a' ? primary.label : secondary?.label ?? '']}
            labelFormatter={(t: number) => tick(t)}
            contentStyle={{ borderRadius: 12, border: '1px solid #E5E5E0', fontSize: 12, color: '#0A1628' }} />
          <Line yAxisId="a" type="linear" dataKey="a" name="a" stroke={INK} strokeWidth={2} connectNulls isAnimationActive={false}
            dot={dot('a', INK) as never} activeDot={false} />
          {secondary && (
            <Line yAxisId="b" type="linear" dataKey="b" name="b" stroke={SLATE} strokeWidth={2} strokeDasharray="5 4" connectNulls isAnimationActive={false}
              dot={dot('b', SLATE) as never} activeDot={false} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
