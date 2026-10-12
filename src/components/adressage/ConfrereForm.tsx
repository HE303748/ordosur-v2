import { useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { notifyDataChanged } from '../../lib/dataSync';
import { createActionLock } from '../../lib/viewCache';
import { createConfrere, updateConfrere, type Confrere, type ConfrereInput } from '../../lib/adressageApi';
import { SPECIALITES_ADRESSAGE } from '../../lib/lettreTexte';

const input = 'w-full px-3 py-2.5 text-sm bg-white border border-[#E5E5E0] rounded-xl text-[#0A1628] placeholder-slate-400 focus:outline-none focus:border-[#00A86B] focus:ring-2 focus:ring-[#00A86B]/15';
const label = 'block text-xs font-semibold text-slate-600 mb-1';
const chip = (on: boolean) => `px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${on
  ? 'bg-[#0A1628] text-white border-[#0A1628]' : 'bg-white text-[#0A1628] border-[#E5E5E0] hover:border-[#0A1628]'}`;

const LISTE = SPECIALITES_ADRESSAGE.map(s => s.label).filter(l => l !== 'Autre');

/**
 * Sprint 7 — Fiche d'un confrère (carnet du médecin) : création ou modification.
 * Utilisée dans Paramètres › Confrères et directement depuis la lettre d'adressage.
 * La civilité saisie est la SEULE source de l'accord « Cher confrère » / « Chère consœur ».
 */
export function ConfrereForm({ confrere = null, defaultSpecialite = '', onSaved, onCancel }: {
  confrere?: Confrere | null;
  defaultSpecialite?: string;
  onSaved: (c: Confrere) => void;
  onCancel: () => void;
}) {
  const { user, doctorProfile } = useAuth();
  const initSpe = confrere?.specialite ?? defaultSpecialite;
  const [f, setF] = useState<ConfrereInput>({
    titre: confrere?.titre ?? 'Dr', civilite: confrere?.civilite ?? null, nom: confrere?.nom ?? '', prenom: confrere?.prenom ?? '',
    specialite: initSpe, etablissement: confrere?.etablissement ?? '', ville: confrere?.ville ?? '',
    telephone: confrere?.telephone ?? '', email: confrere?.email ?? '', notes: confrere?.notes ?? '',
  });
  const [autre, setAutre] = useState(!!initSpe && !LISTE.includes(initSpe) && initSpe !== 'Autre');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(createActionLock()).current;
  const set = <K extends keyof ConfrereInput>(k: K, v: ConfrereInput[K]) => setF(p => ({ ...p, [k]: v }));

  const save = () => lock.run('save', async () => {
    if (saving) return;
    if (!f.nom.trim()) { setError('Le nom est obligatoire.'); return; }
    if (!f.specialite.trim()) { setError('La spécialité est obligatoire.'); return; }
    if (!doctorProfile?.id || !user?.org_id) { setError('Profil médecin non chargé — rechargez la page.'); return; }
    setSaving(true);
    setError(null);
    try {
      const c = confrere ? await updateConfrere(confrere.id, f) : await createConfrere(f, { doctorId: doctorProfile.id, orgId: user.org_id });
      notifyDataChanged('confreres');
      onSaved(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Le confrère n’a pas pu être enregistré.');
    } finally {
      setSaving(false);
    }
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-5 gap-y-3">
        <div>
          <span className={label}>Titre</span>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Titre">
            {(['Dr', 'Pr'] as const).map(t => (
              <button key={t} type="button" role="radio" aria-checked={f.titre === t} onClick={() => set('titre', t)} className={chip(f.titre === t)}>{t}</button>
            ))}
          </div>
        </div>
        <div>
          <span className={label}>Civilité</span>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Civilité">
            {([['M', 'M.'], ['Mme', 'Mme']] as const).map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={f.civilite === v}
                onClick={() => set('civilite', f.civilite === v ? null : v)} className={chip(f.civilite === v)}>{l}</button>
            ))}
          </div>
        </div>
      </div>
      <p className="text-[11px] text-slate-500 -mt-1">La civilité accorde la formule d’ouverture : « Cher confrère, » ou « Chère consœur, ».</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="cf-nom">Nom *</label>
          <input id="cf-nom" className={input} value={f.nom} onChange={e => set('nom', e.target.value)} autoComplete="off" autoFocus={!confrere} />
        </div>
        <div>
          <label className={label} htmlFor="cf-prenom">Prénom</label>
          <input id="cf-prenom" className={input} value={f.prenom ?? ''} onChange={e => set('prenom', e.target.value)} autoComplete="off" />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="cf-spe">Spécialité *</label>
          <select id="cf-spe" className={input} value={autre ? 'Autre' : f.specialite}
            onChange={e => { const v = e.target.value; setAutre(v === 'Autre'); set('specialite', v === 'Autre' ? '' : v); }}>
            <option value="">Choisir…</option>
            {LISTE.map(s => <option key={s} value={s}>{s}</option>)}
            <option value="Autre">Autre (préciser)</option>
          </select>
          {autre && (
            <input className={`${input} mt-2`} value={f.specialite} onChange={e => set('specialite', e.target.value)}
              placeholder="Précisez la spécialité" aria-label="Spécialité (précision)" autoComplete="off" />
          )}
        </div>
        <div>
          <label className={label} htmlFor="cf-etab">Établissement</label>
          <input id="cf-etab" className={input} value={f.etablissement ?? ''} onChange={e => set('etablissement', e.target.value)} placeholder="Clinique, CHU, cabinet…" autoComplete="off" />
        </div>
        <div>
          <label className={label} htmlFor="cf-ville">Ville</label>
          <input id="cf-ville" className={input} value={f.ville ?? ''} onChange={e => set('ville', e.target.value)} autoComplete="off" />
        </div>
        <div>
          <label className={label} htmlFor="cf-tel">Téléphone</label>
          <input id="cf-tel" type="tel" inputMode="tel" className={input} value={f.telephone ?? ''} onChange={e => set('telephone', e.target.value)} autoComplete="off" />
        </div>
        <div>
          <label className={label} htmlFor="cf-mail">E-mail</label>
          <input id="cf-mail" type="email" inputMode="email" className={input} value={f.email ?? ''} onChange={e => set('email', e.target.value)} autoComplete="off" />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="cf-notes">Notes</label>
          <textarea id="cf-notes" rows={2} className={`${input} resize-y`} value={f.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder="Jours de consultation, secrétariat…" />
        </div>
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[#FEF2F2] border border-[#DC2626]/30 text-sm text-[#0A1628]">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#DC2626]" aria-hidden /> {error}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} disabled={saving}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#0A1628] border border-[#E5E5E0] hover:border-[#0A1628] disabled:opacity-50 transition-colors">Annuler</button>
        <button type="button" onClick={() => void save()} disabled={saving}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#00A86B] hover:bg-[#006B47] disabled:opacity-50 transition-colors">
          {saving ? 'Enregistrement…' : confrere ? 'Enregistrer' : 'Ajouter au carnet'}
        </button>
      </div>
    </div>
  );
}
