import { useLayoutEffect, useRef } from 'react';
import { Bold } from 'lucide-react';
import { htmlToMarkup, markupToHtml, normaliserMarkup } from '../../lib/lettreTexte';

/**
 * Sprint 7 — Zone de texte riche SIMPLE : paragraphes et gras, rien d'autre.
 * Le contenu est échangé au format enregistré (paragraphes séparés par une ligne vide, **gras**).
 * La zone n'est réécrite que si la valeur vient de l'extérieur (texte régénéré) : une frappe du
 * médecin ne déplace jamais son curseur. Un collage est toujours ramené à du texte brut.
 */
export function RichTextEditor({ value, onChange, disabled = false, labelledBy }: {
  value: string;
  onChange: (markup: string) => void;
  disabled?: boolean;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const emitted = useRef<string | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (emitted.current !== null && normaliserMarkup(value) === normaliserMarkup(emitted.current)) return;
    el.innerHTML = markupToHtml(value);
    emitted.current = value;
  }, [value]);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    const m = htmlToMarkup(el.innerHTML);
    emitted.current = m;
    onChange(m);
  };

  const bold = () => {
    if (disabled) return;
    ref.current?.focus();
    try { document.execCommand('bold'); } catch { /* commande indisponible : Ctrl+B reste possible */ }
    emit();
  };

  return (
    <div className={`rounded-xl border bg-white transition-colors ${disabled ? 'border-[#E5E5E0] opacity-70' : 'border-[#E5E5E0] focus-within:border-[#00A86B] focus-within:ring-2 focus-within:ring-[#00A86B]/15'}`}>
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-[#E5E5E0]">
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={bold} disabled={disabled}
          aria-label="Mettre en gras (Ctrl+B)" title="Gras (Ctrl+B)"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#0A1628] hover:bg-slate-100 active:bg-slate-200 disabled:opacity-50 transition-colors">
          <Bold className="w-3.5 h-3.5" aria-hidden /> Gras
        </button>
        <span className="text-[11px] text-slate-500">Entrée : nouveau paragraphe</span>
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-labelledby={labelledBy}
        aria-disabled={disabled}
        contentEditable={!disabled}
        suppressContentEditableWarning
        spellCheck
        lang="fr"
        onFocus={() => { try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch { /* ignore */ } }}
        onInput={emit}
        onBlur={emit}
        onPaste={e => {
          e.preventDefault();
          const text = e.clipboardData.getData('text/plain');
          if (!text) return;
          try {
            if (!document.execCommand('insertText', false, text)) throw new Error('insertText');
          } catch {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) { sel.deleteFromDocument(); sel.getRangeAt(0).insertNode(document.createTextNode(text)); sel.collapseToEnd(); }
          }
          emit();
        }}
        onDrop={e => e.preventDefault()}
        className="min-h-[18rem] lg:min-h-[24rem] max-h-[60vh] lg:max-h-none overflow-y-auto px-4 py-3 text-[15px] leading-relaxed text-[#0A1628] outline-none break-words [&_p]:mb-3 [&_p:last-child]:mb-0 [&_div]:mb-3 [&_strong]:font-bold [&_b]:font-bold"
      />
    </div>
  );
}
