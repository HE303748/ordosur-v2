import { useState, type KeyboardEvent, type Ref } from 'react';
import type { ExamRef } from '../../lib/examSearch';
import {
  BORNES_ABSENTES, INTERPRETATION_LABEL, QUALITATIF_CHOIX, examMesure, interpret, matchUnite, parseNombre, resultKind,
  type FieldState, type Interpretation,
} from '../../lib/resultatsLogic';

export const INPUT = 'px-3 py-2 text-sm bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-white/[0.1] rounded-lg text-[#0A1628] dark:text-[#E2E8F0] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00A86B]/40 focus:border-[#00A86B] disabled:opacity-60';
const CHIP = 'px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B]';
const CHIP_ON = 'bg-[#0A1628] text-white border-[#0A1628] dark:bg-[#E2E8F0] dark:text-[#0A1628] dark:border-[#E2E8F0]';
const CHIP_OFF = 'bg-white text-[#0A1628] border-[#E5E5E0] hover:border-[#0A1628] dark:bg-transparent dark:text-[#E2E8F0] dark:border-white/[0.12]';

/** Bas / Haut / Anormal : rouge réservé aux alertes. Normal : vert. */
export function InterpretationBadge({ value, className = '' }: { value: Interpretation | null; className?: string }) {
  if (!value) return null;
  const alert = value !== 'normal';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${alert
      ? 'bg-[#FEF2F2] text-[#B91C1C] ring-1 ring-inset ring-[#DC2626]/20 dark:bg-[#DC2626]/[0.12] dark:text-red-300'
      : 'bg-[#E6F4EE] text-[#006B47] dark:bg-[#00A86B]/[0.12] dark:text-[#00A86B]'} ${className}`}>
      {INTERPRETATION_LABEL[value]}
    </span>
  );
}

interface Props {
  exam: ExamRef | null;
  parametre: string | null;
  field: FieldState;
  onChange: (f: FieldState) => void;
  /** Identifiant unique (libellés accessibles). */
  id: string;
  /** Nom lu par les lecteurs d'écran (« HbA1c »). */
  label: string;
  inputRef?: Ref<HTMLInputElement>;
  /** Entrée dans le champ de valeur (enchaînement au clavier). */
  onEnter?: () => void;
  disabled?: boolean;
  /** Valeur déjà comprise ailleurs (saisie rapide) : affichée, non modifiable ici. */
  lockedValue?: string | null;
}

/**
 * Valeur d'UN résultat, selon la nature de l'examen : chiffre + unité (toujours visible,
 * modifiable en 1 clic) + bornes du laboratoire facultatives ; positif / négatif /
 * indéterminé ; ou compte rendu avec case « Anormal ».
 */
export function ResultFields({ exam, parametre, field: f, onChange, id, label, inputRef, onEnter, disabled, lockedValue }: Props) {
  const kind = resultKind(exam, parametre);
  const mesure = examMesure(exam, parametre);
  const [showBornes, setShowBornes] = useState(() => !!(f.basse || f.haute));
  const enter = (e: KeyboardEvent) => { if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter(); } };

  if (kind === 'qualitatif') {
    return (
      <div role="radiogroup" aria-label={`Résultat ${label}`} className="flex flex-wrap gap-1.5">
        {QUALITATIF_CHOIX.map((c, i) => (
          <button key={c.id} type="button" role="radio" aria-checked={f.texte === c.id} disabled={disabled}
            ref={i === 0 ? (inputRef as unknown as Ref<HTMLButtonElement> | undefined) : undefined}
            onClick={() => onChange({ ...f, texte: f.texte === c.id ? '' : c.id })}
            className={`${CHIP} ${f.texte === c.id ? CHIP_ON : CHIP_OFF}`}>
            {c.label}
          </button>
        ))}
      </div>
    );
  }

  if (kind === 'texte') {
    return (
      <div className="space-y-1.5">
        <input ref={inputRef} id={`${id}-txt`} type="text" value={f.texte} disabled={disabled} maxLength={2000}
          onChange={e => onChange({ ...f, texte: e.target.value })} onKeyDown={enter}
          aria-label={`Résultat ${label}`} placeholder="Conclusion / résultat"
          className={`${INPUT} w-full`} />
        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-[#CBD5E1] cursor-pointer">
          <input type="checkbox" checked={f.anormal} disabled={disabled} onChange={e => onChange({ ...f, anormal: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 text-[#0A1628] focus:ring-[#00A86B]" />
          Anormal
        </label>
      </div>
    );
  }

  // Chiffré (référentiel) ou examen hors référentiel (chiffre + unité libre, ou texte).
  const libre = kind === 'libre';
  const rawValue = libre ? (f.valeur || f.texte) : f.valeur;
  const nombre = parseNombre(f.valeur);
  const isText = libre && !f.valeur && f.texte.trim().length > 0;
  const known = matchUnite(f.unite, mesure);
  const lo = parseNombre(f.basse)?.valeur ?? null, hi = parseNombre(f.haute)?.valeur ?? null;
  const interp = nombre ? interpret(nombre.valeur, lo, hi) : null;
  const setValue = (v: string) => {
    if (!libre) { onChange({ ...f, valeur: v }); return; }
    // Hors référentiel : un nombre (même en cours de frappe) est une valeur, le reste un texte.
    onChange(/^\s*\d[\d\s.,]*$/.test(v) || v === '' ? { ...f, valeur: v, texte: '' } : { ...f, valeur: '', texte: v });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {lockedValue ? (
          <span className="text-base font-bold text-[#0A1628] dark:text-[#E2E8F0] tabular-nums pr-1">{lockedValue}</span>
        ) : <input ref={inputRef} id={`${id}-val`} type="text" inputMode={libre ? 'text' : 'decimal'} autoComplete="off" value={rawValue} disabled={disabled}
          onChange={e => setValue(e.target.value)} onKeyDown={enter}
          aria-label={`Valeur ${label}`} aria-invalid={!!f.valeur && !nombre} placeholder={libre ? 'Valeur ou résultat' : 'Valeur'}
          className={`${INPUT} ${libre ? 'flex-1 min-w-[9rem]' : 'w-28'} ${f.valeur && !nombre ? 'border-[#DC2626] focus:ring-[#DC2626]/30 focus:border-[#DC2626]' : ''}`} />}
        {!isText && mesure.unites.length > 0 && (
          <div role="radiogroup" aria-label={`Unité ${label}`} className="flex flex-wrap gap-1">
            {mesure.unites.map(u => (
              <button key={u.unite} type="button" role="radio" aria-checked={known === u} disabled={disabled}
                onClick={() => onChange({ ...f, unite: u.unite })}
                className={`${CHIP} ${known === u ? CHIP_ON : CHIP_OFF}`}>
                {u.unite}
              </button>
            ))}
            {f.unite && !known && (
              <span className={`${CHIP} ${CHIP_ON}`} title="Unité hors référentiel : ni conversion ni comparaison automatique">{f.unite}</span>
            )}
          </div>
        )}
        {!isText && mesure.unites.length === 0 && (
          <input type="text" value={f.unite ?? ''} disabled={disabled} maxLength={30} onChange={e => onChange({ ...f, unite: e.target.value || null })} onKeyDown={enter}
            aria-label={`Unité ${label}`} placeholder="Unité" className={`${INPUT} w-24`} />
        )}
        {nombre && <InterpretationBadge value={interp} />}
      </div>
      {f.unite && !known && mesure.unites.length > 0 && !isText && (
        <p className="text-[11px] text-amber-800 dark:text-amber-300">
          « {f.unite} » n’est pas une unité du référentiel pour cet examen : la valeur sera enregistrée telle quelle, sans conversion.
        </p>
      )}
      {isText ? (
        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-[#CBD5E1] cursor-pointer">
          <input type="checkbox" checked={f.anormal} disabled={disabled} onChange={e => onChange({ ...f, anormal: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 text-[#0A1628] focus:ring-[#00A86B]" />
          Anormal
        </label>
      ) : showBornes ? (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 dark:text-[#94A3B8]">
          <span>Bornes du labo{f.unite ? ` (${f.unite})` : ''}</span>
          <input type="text" inputMode="decimal" autoComplete="off" value={f.basse} disabled={disabled} onChange={e => onChange({ ...f, basse: e.target.value })} onKeyDown={enter}
            aria-label={`Borne basse ${label}`} placeholder="basse" className={`${INPUT} w-20 py-1.5`} />
          <span aria-hidden>–</span>
          <input type="text" inputMode="decimal" autoComplete="off" value={f.haute} disabled={disabled} onChange={e => onChange({ ...f, haute: e.target.value })} onKeyDown={enter}
            aria-label={`Borne haute ${label}`} placeholder="haute" className={`${INPUT} w-20 py-1.5`} />
          {nombre && !interp && <span className="text-slate-400 dark:text-[#64748B]">{BORNES_ABSENTES}</span>}
        </div>
      ) : (
        <button type="button" disabled={disabled} onClick={() => setShowBornes(true)}
          className="text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] hover:text-[#0A1628] dark:hover:text-[#E2E8F0] underline underline-offset-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A86B]">
          + Bornes du labo (facultatif)
        </button>
      )}
    </div>
  );
}

