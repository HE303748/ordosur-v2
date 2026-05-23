/**
 * PatientImportModal — Import en masse de patients depuis Excel.
 *
 * Sprint #3.1.0
 *
 * Flow :
 *   1. choose      → 2 actions (télécharger template, uploader fichier rempli)
 *   2. preview     → parsing + validation + dedup, affichage compteurs avant import
 *   3. importing   → insertion batch en DB
 *   4. done        → rapport final + bouton fermer
 *
 * Garde-fous :
 *   - org_id injecté automatiquement (jamais dans le template) — sécurité
 *   - Dedup contre la base existante ET intra-fichier
 *   - Doublons silencieux (comptés mais pas insérés)
 *   - Erreurs (prénom/nom manquant) listées mais n'empêchent pas les valides de s'importer
 *   - Insertion batch (1 requête au lieu de N)
 */

import { useState, useRef, useEffect } from 'react';
import { X, Download, Upload, CheckCircle2, AlertCircle, FileSpreadsheet, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase, type Patient } from '../lib/supabase';

// ── Constantes du template ───────────────────────────────────────────────────

const HEADERS = [
  'Prénom *',
  'Nom *',
  'Date de naissance (JJ/MM/AAAA)',
  'Sexe (Homme/Femme)',
  'Téléphone',
  'Email',
  'Adresse',
  'CNIE',
  'Groupe sanguin',
  'Pathologies (séparées par virgules)',
  'Allergies médicaments (séparées par virgules)',
  'Allergies alimentaires (séparées par virgules)',
  'Antécédents chirurgicaux',
] as const;

const EXAMPLE_ROW: (string | number)[] = [
  'Ahmed',
  'Tlemsani',
  '15/03/1980',
  'Homme',
  '+212661234567',
  'ahmed.tlemsani@example.com',
  'Hay Hassani, Casablanca',
  'AB123456',
  'O+',
  'Diabète type 2, Hypertension',
  'Pénicilline',
  'Arachides',
  'Appendicectomie 2010',
];

// ── Helpers de normalisation ─────────────────────────────────────────────────

/** "15/03/1980" → "1980-03-15" (ISO). Retourne null si invalide. */
function parseDate(s: string | undefined | null): string | null {
  if (s == null) return null;
  const txt = String(s).trim();
  if (!txt) return null;
  const m = txt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const dd = d.padStart(2, '0');
  const mm = mo.padStart(2, '0');
  const iso = `${y}-${mm}-${dd}`;
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return null;
  // Validation supplémentaire : la date "retournée par parsing" doit matcher l'entrée
  // (évite "31/02/1980" → "1980-03-02" sans erreur)
  const back = dt.toISOString().slice(0, 10);
  return back === iso ? iso : null;
}

/** "Homme"/"H"/"M"/"masculin" → "M" ; "Femme"/"F"/"féminin" → "F" ; sinon null. */
function normalizeSexe(s: string | undefined | null): 'M' | 'F' | null {
  if (s == null) return null;
  const v = String(s).trim().toLowerCase();
  if (!v) return null;
  if (['h', 'homme', 'm', 'masculin', 'male', 'm.'].includes(v)) return 'M';
  if (['f', 'femme', 'féminin', 'feminin', 'female', 'f.'].includes(v)) return 'F';
  return null;
}

/** "Diabète, Hypertension" → ["Diabète", "Hypertension"]. Trim + filter vides. */
function splitList(s: string | undefined | null): string[] {
  if (s == null) return [];
  return String(s)
    .split(/[,;]/)
    .map(x => x.trim())
    .filter(x => x.length > 0);
}

function clean(s: string | undefined | null): string | null {
  if (s == null) return null;
  const v = String(s).trim();
  return v.length > 0 ? v : null;
}

// ── Dedup ────────────────────────────────────────────────────────────────────

/** Clé de dedup principale : prenom+nom+telephone (insensible casse + sans espaces) */
function dedupKeyPhone(prenom: string, nom: string, telephone: string | null): string {
  const tel = (telephone || '').replace(/\s+/g, '').toLowerCase();
  return `${prenom.trim().toLowerCase()}|${nom.trim().toLowerCase()}|${tel}`;
}

/** Clé secondaire : CNIE (insensible casse) */
function dedupKeyCnie(cnie: string | null): string | null {
  if (!cnie) return null;
  const v = cnie.trim().toLowerCase();
  return v ? `cnie:${v}` : null;
}

// ── Types de l'aperçu ────────────────────────────────────────────────────────

interface ParsedRow {
  rowIndex: number;          // numéro de ligne dans le fichier (1-indexé, ligne en-tête = 1)
  prenom: string;
  nom: string;
  date_naissance: string | null;
  sexe: 'M' | 'F' | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  cnie: string | null;
  groupe_sanguin: string | null;
  pathologies: string[];
  allergies_medicaments: string[];
  allergies_alimentaires: string[];
  antecedents_chirurgicaux: string | null;
}

interface RowError {
  rowIndex: number;
  reason: string;
}

interface ParseResult {
  toImport: ParsedRow[];
  duplicates: { rowIndex: number; label: string; reason: string }[];
  errors: RowError[];
}

// ── Composant ────────────────────────────────────────────────────────────────

type Step = 'choose' | 'preview' | 'importing' | 'done';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  existingPatients: Patient[];
  onImported: (count: number) => void;
}

export function PatientImportModal({ isOpen, onClose, orgId, existingPatients, onImported }: Props) {
  const [step, setStep] = useState<Step>('choose');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state quand on rouvre la modal
  useEffect(() => {
    if (isOpen) {
      setStep('choose');
      setParseResult(null);
      setImportedCount(0);
      setImportError(null);
    }
  }, [isOpen]);

  // Lock du scroll pendant la modal
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  // ── Téléchargement du template ─────────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([HEADERS as unknown as string[], EXAMPLE_ROW]);
    // Largeurs de colonnes pour lisibilité
    ws['!cols'] = HEADERS.map(h => ({ wch: Math.max(h.length + 2, 22) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Patients');
    XLSX.writeFile(wb, 'ordosur_template_patients.xlsx');
  };

  // ── Upload + parsing + validation ─────────────────────────────────────────
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permettre la re-sélection du même fichier
    if (!file) return;

    // Garde-fou taille
    if (file.size > 5 * 1024 * 1024) {
      setImportError('Fichier trop volumineux (max 5 Mo).');
      setStep('done');
      return;
    }

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: false });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) throw new Error('Fichier Excel vide');
      const ws = wb.Sheets[sheetName];
      // raw:false → tout en string (évite que SheetJS interprète les dates en number JS)
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });

      if (rows.length > 5000) {
        setImportError('Trop de lignes (max 5000). Fractionnez votre fichier.');
        setStep('done');
        return;
      }

      // Détection souple des colonnes : on cherche par mot-clé (le médecin peut renommer
      // légèrement les en-têtes en gardant l'idée — ex: "Téléphone" sans astérisque)
      const findCol = (sample: Record<string, unknown>, keywords: string[]): string | null => {
        const keys = Object.keys(sample);
        for (const kw of keywords) {
          const found = keys.find(k => k.toLowerCase().includes(kw.toLowerCase()));
          if (found) return found;
        }
        return null;
      };

      const sample = rows[0] ?? {};
      const col = {
        prenom:        findCol(sample, ['prénom', 'prenom']),
        nom:           findCol(sample, ['nom']),
        dn:            findCol(sample, ['naissance']),
        sexe:          findCol(sample, ['sexe']),
        tel:           findCol(sample, ['téléphone', 'telephone', 'tel']),
        email:         findCol(sample, ['email', 'mail']),
        adresse:       findCol(sample, ['adresse']),
        cnie:          findCol(sample, ['cnie', 'cin']),
        gs:            findCol(sample, ['sanguin', 'groupe']),
        patho:         findCol(sample, ['pathologie']),
        allMed:        findCol(sample, ['allergies médicaments', 'allergies medicaments', 'allergie med']),
        allAli:        findCol(sample, ['allergies alimentaires', 'allergie aliment']),
        antec:         findCol(sample, ['antécédent', 'antecedent']),
      };

      if (!col.prenom || !col.nom) {
        setImportError('Le fichier doit contenir des colonnes "Prénom" et "Nom". Téléchargez le modèle pour la structure attendue.');
        setStep('done');
        return;
      }

      // Construction des sets de dedup contre l'existant en DB
      const existingPhoneKeys = new Set<string>();
      const existingCnieKeys  = new Set<string>();
      for (const p of existingPatients) {
        existingPhoneKeys.add(dedupKeyPhone(p.prenom, p.nom, p.telephone ?? null));
        const ck = dedupKeyCnie(p.cnie ?? null);
        if (ck) existingCnieKeys.add(ck);
      }

      // Sets pour dedup INTRA-fichier
      const seenPhoneKeys = new Set<string>();
      const seenCnieKeys  = new Set<string>();

      const result: ParseResult = { toImport: [], duplicates: [], errors: [] };

      rows.forEach((raw, i) => {
        const rowIndex = i + 2; // ligne 1 = en-tête en Excel
        const prenom = clean(raw[col.prenom!] as string) ?? '';
        const nom    = clean(raw[col.nom!]    as string) ?? '';

        // Erreur bloquante : prénom OU nom manquant
        if (!prenom && !nom) {
          // Ligne entièrement vide → on l'ignore silencieusement
          return;
        }
        if (!prenom || !nom) {
          result.errors.push({
            rowIndex,
            reason: !prenom ? 'Prénom manquant' : 'Nom manquant',
          });
          return;
        }

        const parsed: ParsedRow = {
          rowIndex,
          prenom,
          nom,
          date_naissance: parseDate(raw[col.dn ?? ''] as string),
          sexe:           normalizeSexe(raw[col.sexe ?? ''] as string),
          telephone:      clean(raw[col.tel ?? ''] as string),
          email:          clean(raw[col.email ?? ''] as string),
          adresse:        clean(raw[col.adresse ?? ''] as string),
          cnie:           clean(raw[col.cnie ?? ''] as string),
          groupe_sanguin: clean(raw[col.gs ?? ''] as string),
          pathologies:            splitList(raw[col.patho  ?? ''] as string),
          allergies_medicaments:  splitList(raw[col.allMed ?? ''] as string),
          allergies_alimentaires: splitList(raw[col.allAli ?? ''] as string),
          antecedents_chirurgicaux: clean(raw[col.antec ?? ''] as string),
        };

        // Dedup
        const phoneKey = dedupKeyPhone(parsed.prenom, parsed.nom, parsed.telephone);
        const cnieKey  = dedupKeyCnie(parsed.cnie);

        if (existingPhoneKeys.has(phoneKey)) {
          result.duplicates.push({ rowIndex, label: `${parsed.prenom} ${parsed.nom}`, reason: 'déjà dans la base (même nom + téléphone)' });
          return;
        }
        if (cnieKey && existingCnieKeys.has(cnieKey)) {
          result.duplicates.push({ rowIndex, label: `${parsed.prenom} ${parsed.nom}`, reason: 'déjà dans la base (même CNIE)' });
          return;
        }
        if (seenPhoneKeys.has(phoneKey)) {
          result.duplicates.push({ rowIndex, label: `${parsed.prenom} ${parsed.nom}`, reason: 'doublon dans le fichier (même nom + téléphone)' });
          return;
        }
        if (cnieKey && seenCnieKeys.has(cnieKey)) {
          result.duplicates.push({ rowIndex, label: `${parsed.prenom} ${parsed.nom}`, reason: 'doublon dans le fichier (même CNIE)' });
          return;
        }

        seenPhoneKeys.add(phoneKey);
        if (cnieKey) seenCnieKeys.add(cnieKey);
        result.toImport.push(parsed);
      });

      setParseResult(result);
      setStep('preview');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Erreur lors du parsing du fichier');
      setStep('done');
    }
  };

  // ── Insertion batch ────────────────────────────────────────────────────────
  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.toImport.length === 0) return;
    setStep('importing');
    setImportError(null);

    try {
      const rows = parseResult.toImport.map(r => ({
        org_id:                   orgId,
        prenom:                   r.prenom,
        nom:                      r.nom,
        date_naissance:           r.date_naissance,
        sexe:                     r.sexe,
        telephone:                r.telephone,
        email:                    r.email,
        adresse:                  r.adresse,
        cnie:                     r.cnie,
        groupe_sanguin:           r.groupe_sanguin,
        pathologies:              r.pathologies.length > 0 ? r.pathologies : null,
        allergies_medicaments:    r.allergies_medicaments.length > 0 ? r.allergies_medicaments : null,
        allergies_alimentaires:   r.allergies_alimentaires.length > 0 ? r.allergies_alimentaires : null,
        antecedents_chirurgicaux: r.antecedents_chirurgicaux,
      }));

      const { error } = await supabase.from('patients').insert(rows);
      if (error) throw error;

      setImportedCount(rows.length);
      onImported(rows.length);
      setStep('done');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Erreur lors de l\'insertion en base');
      setStep('done');
    }
  };

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={step === 'importing' ? undefined : onClose}
      />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden border border-[#E5E5E0]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E5E5E0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E6F4EE] flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-[#00A86B]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0A1628]">Importer des patients</h2>
              <p className="text-xs text-[#94A3B8]">Depuis un fichier Excel (.xlsx)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={step === 'importing'}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5 text-[#94A3B8]" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[calc(90vh-160px)]">
          {/* ── Step: choose ────────────────────────────────────────────── */}
          {step === 'choose' && (
            <div className="space-y-3">
              <p className="text-sm text-[#475569]">
                <strong className="text-[#0A1628]">Étape 1 :</strong> téléchargez le modèle Excel Ordosur.
                <br />
                <strong className="text-[#0A1628]">Étape 2 :</strong> remplissez-le avec vos patients (une ligne par patient).
                <br />
                <strong className="text-[#0A1628]">Étape 3 :</strong> ré-uploadez-le ci-dessous.
              </p>

              <button
                onClick={handleDownloadTemplate}
                className="w-full flex items-center gap-3 p-4 bg-[#FAFAF7] border border-[#E5E5E0] rounded-xl hover:border-[#00A86B] hover:bg-[#E6F4EE]/30 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-[#E6F4EE] flex items-center justify-center flex-shrink-0">
                  <Download className="w-5 h-5 text-[#00A86B]" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#0A1628] text-sm">Télécharger le modèle Excel</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    13 colonnes — Prénom*, Nom*, et 11 champs optionnels. Une ligne d'exemple incluse.
                  </p>
                </div>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-3 p-4 bg-[#00A86B] hover:bg-[#006B47] rounded-xl transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white text-sm">Importer un fichier rempli</p>
                  <p className="text-xs text-white/80 mt-0.5">
                    Sélectionnez votre fichier .xlsx — aperçu avant import.
                  </p>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFileSelected}
                className="hidden"
              />

              <div className="mt-4 p-3 bg-[#FAFAF7] rounded-xl border border-[#E5E5E0]">
                <p className="text-xs text-[#475569] leading-relaxed">
                  <strong className="text-[#0A1628]">À savoir :</strong> les patients en doublon (même nom + téléphone, ou même CNIE
                  qu'un patient existant) sont automatiquement ignorés. Format des dates&nbsp;: JJ/MM/AAAA. Pour
                  les listes (pathologies, allergies), séparez les valeurs par des virgules.
                </p>
              </div>
            </div>
          )}

          {/* ── Step: preview ───────────────────────────────────────────── */}
          {step === 'preview' && parseResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-[#E6F4EE] rounded-xl border border-[#00A86B]/20">
                  <p className="text-2xl font-bold text-[#00A86B]">{parseResult.toImport.length}</p>
                  <p className="text-xs text-[#006B47] font-semibold mt-0.5">à importer</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-2xl font-bold text-slate-600">{parseResult.duplicates.length}</p>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">doublons ignorés</p>
                </div>
                <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                  <p className="text-2xl font-bold text-red-600">{parseResult.errors.length}</p>
                  <p className="text-xs text-red-700 font-semibold mt-0.5">lignes en erreur</p>
                </div>
              </div>

              {parseResult.errors.length > 0 && (
                <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                  <p className="text-xs font-semibold text-red-700 mb-2">Lignes en erreur (non importées)</p>
                  <ul className="text-xs text-red-800 space-y-1 max-h-32 overflow-y-auto">
                    {parseResult.errors.slice(0, 20).map((e, i) => (
                      <li key={i}>• Ligne {e.rowIndex} : {e.reason}</li>
                    ))}
                    {parseResult.errors.length > 20 && (
                      <li className="italic text-red-600">… et {parseResult.errors.length - 20} autres</li>
                    )}
                  </ul>
                </div>
              )}

              {parseResult.duplicates.length > 0 && (
                <details className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <summary className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Voir les doublons ignorés ({parseResult.duplicates.length})
                  </summary>
                  <ul className="text-xs text-slate-700 mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {parseResult.duplicates.slice(0, 30).map((d, i) => (
                      <li key={i}>• Ligne {d.rowIndex} : <strong>{d.label}</strong> — {d.reason}</li>
                    ))}
                    {parseResult.duplicates.length > 30 && (
                      <li className="italic text-slate-500">… et {parseResult.duplicates.length - 30} autres</li>
                    )}
                  </ul>
                </details>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep('choose')}
                  className="flex-1 px-4 py-2.5 border border-[#E5E5E0] text-[#475569] rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={parseResult.toImport.length === 0}
                  className="flex-1 px-4 py-2.5 bg-[#00A86B] hover:bg-[#006B47] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Confirmer l'import ({parseResult.toImport.length})
                </button>
              </div>
            </div>
          )}

          {/* ── Step: importing ─────────────────────────────────────────── */}
          {step === 'importing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-12 h-12 text-[#00A86B] animate-spin mb-4" />
              <p className="text-sm font-semibold text-[#0A1628]">Import en cours…</p>
              <p className="text-xs text-[#94A3B8] mt-1">Insertion des patients en base</p>
            </div>
          )}

          {/* ── Step: done ──────────────────────────────────────────────── */}
          {step === 'done' && (
            <div className="py-6 flex flex-col items-center text-center">
              {importError ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-3">
                    <AlertCircle className="w-7 h-7 text-red-600" />
                  </div>
                  <p className="text-sm font-semibold text-[#0A1628]">Échec de l'import</p>
                  <p className="text-xs text-red-700 mt-2 max-w-md">{importError}</p>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-[#E6F4EE] flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-7 h-7 text-[#00A86B]" />
                  </div>
                  <p className="text-sm font-semibold text-[#0A1628]">
                    ✅ {importedCount} patient{importedCount > 1 ? 's' : ''} importé{importedCount > 1 ? 's' : ''}.
                  </p>
                  {parseResult && (
                    <p className="text-xs text-[#475569] mt-1">
                      {parseResult.duplicates.length} doublon{parseResult.duplicates.length > 1 ? 's' : ''} ignoré{parseResult.duplicates.length > 1 ? 's' : ''}{' · '}
                      {parseResult.errors.length} ligne{parseResult.errors.length > 1 ? 's' : ''} en erreur
                    </p>
                  )}
                </>
              )}
              <button
                onClick={onClose}
                className="mt-5 px-5 py-2 bg-[#0A1628] hover:bg-[#1A2B42] text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
