import { useState } from 'react';
import { Plus, Pencil, Archive, ArchiveRestore, Phone, Mail } from 'lucide-react';
import { notifyDataChanged } from '../../lib/dataSync';
import { setConfrereArchive, type Confrere } from '../../lib/adressageApi';
import { nomConfrere } from '../../lib/lettreTexte';
import { useConfreres } from '../../hooks/useAdressages';
import { ConfrereForm } from './ConfrereForm';

const CARD = 'bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-sm p-5';

/**
 * Sprint 7 — Paramètres › Confrères : carnet des correspondants du médecin.
 * Ajouter, modifier, archiver (jamais de suppression : les lettres déjà écrites gardent leur destinataire).
 */
export function ConfreresSettings() {
  const [showArchived, setShowArchived] = useState(false);
  const { confreres, loading, error, reload } = useConfreres(showArchived);
  const [editing, setEditing] = useState<Confrere | 'new' | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const archive = async (c: Confrere) => {
    if (busyId) return;
    setBusyId(c.id);
    setActionError(null);
    try {
      await setConfrereArchive(c.id, !c.archive);
      notifyDataChanged('confreres');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Action impossible');
    } finally {
      setBusyId(null);
    }
  };

  const actifs = confreres.filter(c => !c.archive);
  const archives = confreres.filter(c => c.archive);

  return (
    <div className="space-y-4">
      <div className={CARD}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-[#E2E8F0]">Carnet de confrères</h3>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">Vos correspondants, proposés à la rédaction d’une lettre d’adressage.</p>
          </div>
          {editing === null && (
            <button type="button" onClick={() => setEditing('new')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#00A86B] hover:bg-[#006B47] text-white rounded-xl text-xs font-semibold transition-colors">
              <Plus className="w-3.5 h-3.5" aria-hidden /> Ajouter un confrère
            </button>
          )}
        </div>

        {editing !== null && (
          <div className="mt-4 p-4 rounded-xl bg-[#FAFAF7] border border-[#E5E5E0]">
            <p className="text-sm font-bold text-[#0A1628] mb-3">{editing === 'new' ? 'Nouveau confrère' : `Modifier ${nomConfrere(editing)}`}</p>
            <ConfrereForm key={editing === 'new' ? 'new' : editing.id} confrere={editing === 'new' ? null : editing}
              onCancel={() => setEditing(null)} onSaved={() => setEditing(null)} />
          </div>
        )}

        {(error || actionError) && (
          <div role="alert" className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-sm text-amber-900 dark:text-amber-200">
            <span className="flex-1">{actionError ?? error}</span>
            {error && <button type="button" onClick={() => void reload()} className="font-semibold underline underline-offset-2">Réessayer</button>}
          </div>
        )}

        <div className="mt-4">
          {loading && confreres.length === 0 ? (
            <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-white/[0.05] animate-pulse" />)}</div>
          ) : actifs.length === 0 && !error ? (
            <p className="text-sm text-slate-500 dark:text-[#94A3B8] py-6 text-center">Aucun confrère enregistré. Vous pouvez aussi en ajouter directement depuis une lettre.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {[...actifs, ...archives].map(c => (
                <li key={c.id} className={`flex items-start gap-3 py-3 ${c.archive ? 'opacity-60' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0A1628] dark:text-[#E2E8F0] truncate">
                      {nomConfrere(c)}{c.archive && <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">archivé</span>}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-[#94A3B8] truncate">{[c.specialite, c.etablissement, c.ville].filter(Boolean).join(' · ')}</p>
                    {(c.telephone || c.email) && (
                      <p className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-slate-500 dark:text-[#94A3B8]">
                        {c.telephone && <a href={`tel:${c.telephone}`} className="inline-flex items-center gap-1 hover:text-[#00A86B]"><Phone className="w-3 h-3" aria-hidden />{c.telephone}</a>}
                        {c.email && <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:text-[#00A86B]"><Mail className="w-3 h-3" aria-hidden />{c.email}</a>}
                      </p>
                    )}
                    {c.notes && <p className="text-xs text-slate-400 dark:text-[#64748B] mt-0.5 truncate">{c.notes}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!c.archive && (
                      <button type="button" onClick={() => setEditing(c)} aria-label={`Modifier ${nomConfrere(c)}`} title="Modifier"
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"><Pencil className="w-4 h-4" /></button>
                    )}
                    <button type="button" onClick={() => void archive(c)} disabled={busyId === c.id}
                      aria-label={c.archive ? `Rétablir ${nomConfrere(c)}` : `Archiver ${nomConfrere(c)}`} title={c.archive ? 'Rétablir' : 'Archiver'}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06] disabled:opacity-50 transition-colors">
                      {c.archive ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <label className="flex items-center gap-2 mt-3 text-xs text-slate-600 dark:text-[#94A3B8] cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded border-slate-300 accent-[#00A86B]" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />
          Afficher les confrères archivés
        </label>
      </div>
    </div>
  );
}
