import { FlaskConical, ScanLine, Activity } from 'lucide-react';
import type { ExamPage } from '../../lib/examDocument';
import { fastingLabel } from '../../lib/examDocument';

const ICON = { biologie: FlaskConical, imagerie: ScanLine, exploration: Activity, imagerie_groupee: ScanLine } as const;

/** Aperçu écran des pages « Examens à réaliser » (même contenu que le PDF). */
export function ExamPagesPreview({ pages }: { pages: ExamPage[] }) {
  if (pages.length === 0) return null;
  return (
    <div className="space-y-3">
      {pages.map((p, i) => {
        const Icon = ICON[p.kind];
        return (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-bold text-[#006B47] min-w-0">
                <Icon className="w-4 h-4 flex-shrink-0" aria-hidden />
                <span className="break-words">{p.heading}</span>
              </p>
            </div>
            <p className={`text-xs mt-1 ${p.urgent ? 'font-bold text-[#0A1628]' : 'text-slate-600'}`}>{p.subtitle}</p>
            {p.fasting && (
              <p className="mt-2 inline-block px-2.5 py-1 rounded-md border border-amber-400 text-[11px] font-bold text-[#0A1628]">{fastingLabel(p.fasting)}</p>
            )}
            {p.notes.length > 0 && (
              <ul className="mt-2 px-2.5 py-1.5 rounded-md border border-slate-300 text-[11px] font-semibold text-[#0A1628] space-y-0.5">
                {p.notes.map(n => <li key={n}>• {n}</li>)}
              </ul>
            )}
            {p.renseignements && (
              <p className="mt-2 text-xs text-slate-600"><span className="font-semibold text-[#00A86B] uppercase tracking-wide text-[10px]">Renseignements cliniques · </span>{p.renseignements}</p>
            )}
            <div className="mt-2 space-y-2">
              {p.groups.map((g, gi) => (
                <div key={gi}>
                  {g.label && <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{g.label}</p>}
                  <ul className="mt-0.5 space-y-0.5">
                    {g.items.map((it, ii) => (
                      <li key={ii} className="text-sm text-[#0A1628]">
                        <span className="font-semibold">{it.libelle}</span>
                        {it.precision && <span className="text-slate-600"> — {it.precision}</span>}
                        {it.question && <span className="block text-xs italic text-slate-600">Question posée : {it.question}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {p.ald && <p className="mt-2 text-[11px] italic text-slate-500">En rapport avec une affection de longue durée (ALD / ALC).</p>}
          </div>
        );
      })}
    </div>
  );
}
