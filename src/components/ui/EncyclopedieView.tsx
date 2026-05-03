import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, BookOpen, Pill, Activity, AlertTriangle, Zap, ChevronRight,
  Info, Stethoscope, Tag, Globe, FlaskConical, X,
  ChevronLeft, ChevronDown, Filter, Hash,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface Medicament {
  id: string;
  nom: string;
  dci: string | null;
  forme: string | null;
  dosage: string | null;
  nom_commercial: string | null;
  laboratoire: string | null;
  voie_administration: string | null;
  pays: string | null;
  ppv_ma: number | null;
  classe_therapeutique: string | null;
  remboursement_cnops: boolean | null;
}

interface Pathologie {
  id: string;
  nom_fr: string;
  nom_en: string | null;
  categorie: string | null;
  description_fr: string | null;
  icd10_code: string | null;
  icd11_code: string | null;
  symptomes_principaux: string | null;
  traitements_recommandes: string | null;
}

interface Contraindication {
  condition_type: string;
  condition_valeur: string;
  severite: string;
  description: string | null;
  mecanisme_fr: string | null;
  conduite_fr: string | null;
}

interface DrugInteraction {
  dci_1_pattern: string;
  dci_2_pattern: string;
  severite: string;
  description: string | null;
}

const PAGE_SIZE = 20;

/* ── helpers ─────────────────────────────────────────────────────────────── */
function getPaysFlag(pays: string | null): string {
  if (pays === 'MA') return '🇲🇦';
  if (pays === 'FR') return '🇫🇷';
  return '';
}

/** Detect if a string looks like it's primarily in English (no French accents, common EN words) */
function looksEnglish(text: string): boolean {
  if (!text) return false;
  const frenchIndicators = /[àâäéèêëîïôùûüç]/i;
  if (frenchIndicators.test(text)) return false;
  const englishWords = /\b(the|and|or|of|is|are|was|were|has|have|this|that|with|for|not|may|can|should|treatment|patient|condition|drug|dose|effect)\b/i;
  return englishWords.test(text);
}

/* ── Severity badge ─────────────────────────────────────────────────────────── */
function SeverityBadge({ severite }: { severite: string }) {
  const s = (severite || '').toLowerCase();
  const cfg =
    s === 'absolue' || s === 'contre_indication' || s === 'contre-indication absolue' || s === 'majeure'
      ? { cls: 'bg-red-100 text-red-800 border-red-200', label: s === 'contre_indication' ? 'CI' : s === 'absolue' ? 'absolue' : s }
      : s === 'relative' || s === 'moderee' || s === 'modérée' || s === 'modéree'
      ? { cls: 'bg-orange-100 text-orange-800 border-orange-200', label: s === 'moderee' || s === 'modéree' ? 'modérée' : s }
      : s === 'mineure' || s === 'précaution'
      ? { cls: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: s }
      : { cls: 'bg-slate-100 text-slate-700 border-slate-200', label: s };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

/* ── Pagination bar ──────────────────────────────────────────────────────────── */
function Pagination({ page, total, pageSize, onChange }: {
  page: number; total: number; pageSize: number; onChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 dark:border-white/[0.06] flex-shrink-0 bg-slate-50 dark:bg-white/[0.02]">
      <span className="text-[10px] text-slate-400 tabular-nums">
        {start.toLocaleString()}–{end.toLocaleString()} / {total.toLocaleString()}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 px-1 tabular-nums">
          {page}/{totalPages}
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────────────── */
function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <Icon className="w-10 h-10 mb-3 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

/* ── Médicament detail panel ─────────────────────────────────────────────────── */
function MedDetail({ med, onClose }: { med: Medicament; onClose: () => void }) {
  const [contras, setContras]           = useState<Contraindication[]>([]);
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setContras([]); setInteractions([]);
      if (!med.dci) { setLoading(false); return; }
      const dciLower = med.dci.toLowerCase();

      const [cRes, iRes] = await Promise.all([
        supabase.from('contraindications')
          .select('condition_type, condition_valeur, severite, description, mecanisme_fr, conduite_fr')
          .ilike('dci_pattern', `%${dciLower}%`)
          .limit(80),
        supabase.from('drug_interactions')
          .select('dci_1_pattern, dci_2_pattern, severite, description')
          .or(`dci_1_pattern.ilike.%${dciLower}%,dci_2_pattern.ilike.%${dciLower}%`)
          .limit(150),
      ]);

      // Dédoublonnage contre-indications (condition_valeur + severite)
      const seenC = new Set<string>();
      const cleanContras = ((cRes.data as Contraindication[]) || []).filter(c => {
        const key = `${c.condition_valeur.toLowerCase()}|${c.severite}`;
        if (seenC.has(key)) return false;
        seenC.add(key);
        return true;
      });

      // Dédoublonnage interactions (paire triée + sévérité)
      const seenI = new Set<string>();
      const cleanInteractions = ((iRes.data as DrugInteraction[]) || []).filter(it => {
        const key = [it.dci_1_pattern.toLowerCase(), it.dci_2_pattern.toLowerCase()].sort().join('|') + `|${it.severite}`;
        if (seenI.has(key)) return false;
        seenI.add(key);
        return true;
      });

      setContras(cleanContras);
      setInteractions(cleanInteractions);
      setLoading(false);
    };
    load();
  }, [med.id, med.dci]);

  /* ── Groupement interactions par sévérité ── */
  const isMajeure  = (s: string) => ['contre_indication', 'majeure'].includes(s.toLowerCase());
  const isModeree  = (s: string) => ['moderee', 'modérée', 'modéree', 'modere'].includes(s.toLowerCase());
  const isMineure  = (s: string) => ['mineure', 'précaution', 'precaution'].includes(s.toLowerCase());

  const majorInt    = interactions.filter(it => isMajeure(it.severite)).slice(0, 10);
  const modereeInt  = interactions.filter(it => isModeree(it.severite)).slice(0, 5);
  const mineureInt  = interactions.filter(it => isMineure(it.severite));

  /* ── Groupement contre-indications par sévérité ── */
  const isAbsolue  = (s: string) => ['absolue', 'contre_indication', 'contre-indication absolue'].includes(s.toLowerCase());
  const isRelative = (s: string) => ['relative', 'moderee', 'modérée', 'modéree'].includes(s.toLowerCase());

  const absoluteCI = contras.filter(c => isAbsolue(c.severite));
  const relativeCI = contras.filter(c => isRelative(c.severite));
  const autresCI   = contras.filter(c => !isAbsolue(c.severite) && !isRelative(c.severite));

  /* ── Obtenir le partenaire d'une interaction ── */
  const getPartner = (it: DrugInteraction): string => {
    if (!med.dci) return it.dci_2_pattern;
    return it.dci_1_pattern.toLowerCase().includes(med.dci.toLowerCase())
      ? it.dci_2_pattern
      : it.dci_1_pattern;
  };

  const paysFlag = getPaysFlag(med.pays);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.18 }} className="flex flex-col h-full overflow-hidden">

      {/* ── En-tête ── */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-start gap-3 flex-shrink-0">
        <div className="w-10 h-10 bg-sky-100 dark:bg-sky-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <Pill className="w-5 h-5 text-sky-600 dark:text-sky-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
            {med.nom_commercial || med.nom}
          </h2>
          {med.dci && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              DCI : <span className="font-medium">{med.dci}</span>
            </p>
          )}
        </div>
        <button onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.07] rounded-lg transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">

        {/* ── 1. INFORMATIONS DU MÉDICAMENT ── */}
        <section>
          <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-sky-500" />
            Informations du médicament
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Classe thérapeutique', value: med.classe_therapeutique, icon: BookOpen  },
              { label: 'Forme',                value: med.forme,                 icon: FlaskConical },
              { label: 'Dosage',               value: med.dosage,                icon: Zap      },
              { label: 'Laboratoire',          value: med.laboratoire,           icon: Tag      },
              { label: 'Pays d\'origine',
                value: med.pays ? `${paysFlag} ${med.pays}` : null,
                icon: Globe },
            ].map(({ label, value, icon: Icon }) => value ? (
              <div key={label} className="bg-slate-50 dark:bg-white/[0.04] rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</span>
                </div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 break-words">{value}</p>
              </div>
            ) : null)}
          </div>
        </section>

        {/* ── 2. INTERACTIONS MÉDICAMENTEUSES ── */}
        {loading ? (
          <div className="text-center py-6 text-slate-400 text-sm">Chargement…</div>
        ) : (
          <>
            <section>
              <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-orange-500" />
                Interactions médicamenteuses ({majorInt.length + modereeInt.length + mineureInt.length})
              </h3>

              {majorInt.length === 0 && modereeInt.length === 0 && mineureInt.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Aucune interaction enregistrée.</p>
              ) : (
                <div className="space-y-3">
                  {/* Majeures */}
                  {majorInt.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase mb-1.5 flex items-center gap-1">
                        🔴 Majeures ({majorInt.length})
                      </p>
                      <div className="space-y-2">
                        {majorInt.map((it, i) => (
                          <div key={i} className="bg-red-50 dark:bg-red-500/[0.07] rounded-xl p-3 border border-red-100 dark:border-red-500/20">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-semibold text-red-800 dark:text-red-300 capitalize">{getPartner(it)}</span>
                              <SeverityBadge severite={it.severite} />
                            </div>
                            {it.description && !looksEnglish(it.description) && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{it.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Modérées */}
                  {modereeInt.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase mb-1.5 flex items-center gap-1">
                        🟠 Modérées ({modereeInt.length})
                      </p>
                      <div className="space-y-2">
                        {modereeInt.map((it, i) => (
                          <div key={i} className="bg-orange-50 dark:bg-orange-500/[0.07] rounded-xl p-3 border border-orange-100 dark:border-orange-500/20">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-semibold text-orange-800 dark:text-orange-300 capitalize">{getPartner(it)}</span>
                              <SeverityBadge severite={it.severite} />
                            </div>
                            {it.description && !looksEnglish(it.description) && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{it.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mineures */}
                  {mineureInt.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400 uppercase mb-1.5 flex items-center gap-1">
                        🟢 Mineures ({mineureInt.length})
                      </p>
                      <div className="space-y-2">
                        {mineureInt.map((it, i) => (
                          <div key={i} className="bg-yellow-50 dark:bg-yellow-500/[0.07] rounded-xl p-3 border border-yellow-100 dark:border-yellow-500/20">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-semibold text-yellow-800 dark:text-yellow-300 capitalize">{getPartner(it)}</span>
                              <SeverityBadge severite={it.severite} />
                            </div>
                            {it.description && !looksEnglish(it.description) && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{it.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ── 3. CONTRE-INDICATIONS ── */}
            <section>
              <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                Contre-indications ({contras.length})
              </h3>

              {contras.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Aucune contre-indication enregistrée.</p>
              ) : (
                <div className="space-y-3">
                  {/* CI Absolues */}
                  {absoluteCI.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase mb-1.5">
                        CI absolues ({absoluteCI.length})
                      </p>
                      <div className="space-y-2">
                        {absoluteCI.map((c, i) => (
                          <div key={i} className="bg-red-50 dark:bg-red-500/[0.07] rounded-xl p-3 border border-red-100 dark:border-red-500/20">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-semibold text-red-800 dark:text-red-300">{c.condition_valeur}</span>
                              <SeverityBadge severite={c.severite} />
                            </div>
                            {c.conduite_fr && (
                              <p className="text-[10px] text-sky-600 dark:text-sky-400 mt-1 font-medium">→ {c.conduite_fr}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CI Relatives */}
                  {relativeCI.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase mb-1.5">
                        CI relatives ({relativeCI.length})
                      </p>
                      <div className="space-y-2">
                        {relativeCI.map((c, i) => (
                          <div key={i} className="bg-orange-50 dark:bg-orange-500/[0.07] rounded-xl p-3 border border-orange-100 dark:border-orange-500/20">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-semibold text-orange-800 dark:text-orange-300">{c.condition_valeur}</span>
                              <SeverityBadge severite={c.severite} />
                            </div>
                            {c.conduite_fr && (
                              <p className="text-[10px] text-sky-600 dark:text-sky-400 mt-1 font-medium">→ {c.conduite_fr}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Autres CI */}
                  {autresCI.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                        Précautions ({autresCI.length})
                      </p>
                      <div className="space-y-2">
                        {autresCI.map((c, i) => (
                          <div key={i} className="bg-slate-50 dark:bg-white/[0.04] rounded-xl p-3 border border-slate-200 dark:border-white/[0.08]">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{c.condition_valeur}</span>
                              <SeverityBadge severite={c.severite} />
                            </div>
                            {c.conduite_fr && (
                              <p className="text-[10px] text-sky-600 dark:text-sky-400 mt-1 font-medium">→ {c.conduite_fr}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </motion.div>
  );
}

/* ── Pathologie detail panel ─────────────────────────────────────────────────── */
function PathDetail({ path, onClose }: { path: Pathologie; onClose: () => void }) {
  const [contras, setContras] = useState<Contraindication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true); setContras([]);
      const searchTerm = path.nom_fr.split(' ')[0];
      const { data } = await supabase.from('contraindications')
        .select('condition_type, condition_valeur, severite, description, mecanisme_fr, conduite_fr')
        .ilike('condition_valeur', `%${searchTerm}%`).limit(30);

      // Dédoublonnage
      const seenC = new Set<string>();
      const cleaned = ((data as Contraindication[]) || []).filter(c => {
        const key = `${c.condition_valeur.toLowerCase()}|${c.severite}`;
        if (seenC.has(key)) return false;
        seenC.add(key);
        return true;
      });
      setContras(cleaned);
      setLoading(false);
    };
    load();
  }, [path.id, path.nom_fr]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.18 }} className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-start gap-3 flex-shrink-0">
        <div className="w-10 h-10 bg-violet-100 dark:bg-violet-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <Stethoscope className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{path.nom_fr}</h2>
          {/* nom_en supprimé — affichage uniquement en français */}
        </div>
        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.07] rounded-lg transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="flex flex-wrap gap-2">
          {path.icd10_code && (
            <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 rounded-full text-xs font-bold border border-blue-200 dark:border-blue-500/30">
              CIM-10 : {path.icd10_code}
            </span>
          )}
          {path.icd11_code && (
            <span className="px-2.5 py-1 bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 rounded-full text-xs font-bold border border-cyan-200 dark:border-cyan-500/30">
              CIM-11 : {path.icd11_code}
            </span>
          )}
          {path.categorie && (
            <span className="px-2.5 py-1 bg-violet-100 dark:bg-violet-500/20 text-violet-800 dark:text-violet-300 rounded-full text-xs font-medium border border-violet-200 dark:border-violet-500/30">
              {path.categorie}
            </span>
          )}
        </div>

        {/* Description en français uniquement */}
        {path.description_fr && !looksEnglish(path.description_fr) && (
          <div className="bg-slate-50 dark:bg-white/[0.04] rounded-xl p-4 border border-slate-200 dark:border-white/[0.06]">
            <div className="flex items-center gap-1.5 mb-2">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Description</span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{path.description_fr}</p>
          </div>
        )}

        {/* Symptômes */}
        {path.symptomes_principaux && !looksEnglish(path.symptomes_principaux) && (
          <div className="bg-amber-50 dark:bg-amber-500/[0.07] rounded-xl p-4 border border-amber-200 dark:border-amber-500/20">
            <div className="flex items-center gap-1.5 mb-2">
              <Activity className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Symptômes principaux</span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{path.symptomes_principaux}</p>
          </div>
        )}

        {/* Traitements */}
        {path.traitements_recommandes && !looksEnglish(path.traitements_recommandes) && (
          <div className="bg-emerald-50 dark:bg-emerald-500/[0.07] rounded-xl p-4 border border-emerald-200 dark:border-emerald-500/20">
            <div className="flex items-center gap-1.5 mb-2">
              <Pill className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Traitements recommandés</span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{path.traitements_recommandes}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-6 text-slate-400 text-sm">Chargement…</div>
        ) : (
          <section>
            <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              Médicaments avec précaution ({contras.length})
            </h3>
            {contras.length === 0
              ? <p className="text-xs text-slate-400 italic">Aucune donnée enregistrée.</p>
              : <div className="space-y-2">
                  {contras.map((c, i) => (
                    <div key={i} className="bg-red-50 dark:bg-red-500/[0.07] rounded-xl p-3 border border-red-100 dark:border-red-500/20">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-red-800 dark:text-red-300 capitalize">{c.condition_valeur}</span>
                        <SeverityBadge severite={c.severite} />
                      </div>
                      {c.conduite_fr && <p className="text-[10px] text-sky-600 dark:text-sky-400 mt-1 font-medium">→ {c.conduite_fr}</p>}
                    </div>
                  ))}
                </div>
            }
          </section>
        )}
      </div>
    </motion.div>
  );
}

/* ── FilterSelect ────────────────────────────────────────────────────────────── */
function FilterSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none pl-3 pr-7 py-1.5 text-[11px] font-medium
          bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08]
          rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2
          focus:ring-violet-300 dark:focus:ring-violet-500/40 cursor-pointer"
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
    </div>
  );
}

/* ── ICD-10 chapter options ──────────────────────────────────────────────────── */
const ICD_CHAPTERS = [
  { value: 'Maladies infectieuses et parasitaires',               label: 'A-B · Infectieuses' },
  { value: 'Tumeurs malignes',                                     label: 'C · Tumeurs malignes' },
  { value: 'Tumeurs bénignes et in situ',                          label: 'D0-49 · Tumeurs bénignes' },
  { value: 'Maladies du sang et troubles immunitaires',            label: 'D50-89 · Sang' },
  { value: 'Maladies endocriniennes, nutritionnelles et métaboliques', label: 'E · Endocrinologie' },
  { value: 'Troubles mentaux et du comportement',                  label: 'F · Psychiatrie' },
  { value: 'Maladies du système nerveux',                          label: 'G · Neurologie' },
  { value: "Maladies de l'œil et de ses annexes",                  label: 'H0-59 · Ophtalmologie' },
  { value: "Maladies de l'oreille et de l'apophyse mastoïde",      label: 'H60-95 · ORL' },
  { value: "Maladies de l'appareil circulatoire",                  label: 'I · Cardiologie' },
  { value: "Maladies de l'appareil respiratoire",                  label: 'J · Pneumologie' },
  { value: "Maladies de l'appareil digestif",                      label: 'K · Gastro-entérologie' },
  { value: 'Maladies de la peau et du tissu cellulaire sous-cutané',label: 'L · Dermatologie' },
  { value: "Maladies de l'appareil locomoteur",                    label: 'M · Rhumatologie' },
  { value: "Maladies de l'appareil génito-urinaire",               label: 'N · Urologie / Gynécologie' },
  { value: 'Grossesse, accouchement et puerpéralité',              label: 'O · Obstétrique' },
  { value: "Affections dont l'origine se situe dans la période périnatale", label: 'P · Pédiatrie néonatale' },
  { value: 'Malformations congénitales et anomalies chromosomiques',label: 'Q · Malformations' },
  { value: 'Symptômes, signes et résultats anormaux',              label: 'R · Symptômes' },
  { value: 'Traumatismes, empoisonnements et autres causes externes',label: 'S-T · Traumatismes' },
  { value: 'Causes externes de morbidité et de mortalité',         label: 'V-Y · Causes externes' },
  { value: "Facteurs influant sur l'état de santé",                label: 'Z · Facteurs de santé' },
];

/* ── Main EncyclopedieView ───────────────────────────────────────────────────── */
type Tab = 'medicaments' | 'pathologies';

export function EncyclopedieView() {
  const [tab, setTab]               = useState<Tab>('medicaments');
  const [search, setSearch]         = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Médicaments state
  const [meds, setMeds]             = useState<Medicament[]>([]);
  const [medsLoading, setMedsLoading] = useState(false);
  const [medsTotal, setMedsTotal]   = useState(0);
  const [medsPage, setMedsPage]     = useState(1);
  const [selectedMed, setSelectedMed] = useState<Medicament | null>(null);

  // Pathologies state
  const [paths, setPaths]           = useState<Pathologie[]>([]);
  const [pathsLoading, setPathsLoading] = useState(false);
  const [pathsTotal, setPathsTotal] = useState(0);
  const [pathsPage, setPathsPage]   = useState(1);
  const [selectedPath, setSelectedPath] = useState<Pathologie | null>(null);
  const [filterCat, setFilterCat]   = useState('');

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset on tab change
  useEffect(() => {
    setSearch(''); setDebouncedSearch('');
    setSelectedMed(null); setSelectedPath(null);
    setMedsPage(1); setPathsPage(1);
    setFilterCat('');
  }, [tab]);

  useEffect(() => { setMedsPage(1); }, [debouncedSearch]);
  useEffect(() => { setPathsPage(1); }, [debouncedSearch, filterCat]);

  /* ── Fetch médicaments ── */
  const fetchMeds = useCallback(async (q: string, page: number) => {
    setMedsLoading(true);
    try {
      const from = (page - 1) * PAGE_SIZE;

      if (q.trim().length >= 2) {
        const { data } = await supabase.rpc('search_medicaments', {
          search_term: q,
          limit_count: 200,
        });
        const raw = (data as Medicament[]) || [];

        // Dédoublonnage par clé nom_commercial+dci
        const seen = new Set<string>();
        const unique = raw.filter(m => {
          const key = (m.nom_commercial || m.nom || '').toLowerCase() + '|' + (m.dci || '').toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setMedsTotal(unique.length);
        setMeds(unique.slice(from, from + PAGE_SIZE));
      } else {
        // Navigation directe : filtrer sur nom_commercial non nul
        const to = from + PAGE_SIZE - 1;
        const { data, count } = await supabase
          .from('medicaments')
          .select('id, nom, dci, forme, dosage, nom_commercial, laboratoire, voie_administration, pays, ppv_ma, classe_therapeutique, remboursement_cnops', { count: 'exact' })
          .not('nom_commercial', 'is', null)
          .neq('nom_commercial', '')
          .order('pays', { ascending: true, nullsFirst: false })
          .order('nom_commercial')
          .range(from, to);
        setMeds((data as Medicament[]) || []);
        setMedsTotal(count ?? 0);
      }
    } catch {
      setMeds([]); setMedsTotal(0);
    } finally {
      setMedsLoading(false);
    }
  }, []);

  /* ── Fetch pathologies ── */
  const fetchPaths = useCallback(async (q: string, page: number, cat: string) => {
    setPathsLoading(true);
    try {
      const from = (page - 1) * PAGE_SIZE;
      const to   = from + PAGE_SIZE - 1;

      let query = supabase
        .from('pathologies')
        .select('id, nom_fr, nom_en, categorie, description_fr, icd10_code, icd11_code, symptomes_principaux, traitements_recommandes', { count: 'exact' })
        .not('nom_fr', 'is', null)
        .neq('nom_fr', '')
        .order('nom_fr')
        .range(from, to);

      if (q.trim().length >= 1) {
        query = query.or(`nom_fr.ilike.%${q}%,icd10_code.ilike.%${q}%`);
      }
      if (cat) {
        query = query.eq('categorie', cat);
      }

      const { data, count } = await query;

      // Filtre client-side : exclure codes ICD purs (ex: "A001", "B234")
      const cleaned = ((data as Pathologie[]) || []).filter(
        p => p.nom_fr && !/^[A-Z]\d/.test(p.nom_fr)
      );

      setPaths(cleaned);
      setPathsTotal(count ?? 0);
    } catch {
      setPaths([]); setPathsTotal(0);
    } finally {
      setPathsLoading(false);
    }
  }, []);

  useEffect(() => { if (tab === 'medicaments') fetchMeds(debouncedSearch, medsPage); },
    [debouncedSearch, medsPage, tab, fetchMeds]);
  useEffect(() => { if (tab === 'pathologies') fetchPaths(debouncedSearch, pathsPage, filterCat); },
    [debouncedSearch, pathsPage, filterCat, tab, fetchPaths]);

  useEffect(() => { fetchMeds('', 1); }, [fetchMeds]);

  const hasDetail = selectedMed || selectedPath;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0A0F1E]">
      {/* ── Header ── */}
      <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Encyclopédie médicale</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Médicaments, pathologies, contre-indications &amp; interactions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-white/[0.06] rounded-xl">
            {([
              { id: 'medicaments', label: 'Médicaments', icon: Pill },
              { id: 'pathologies', label: 'Pathologies', icon: Stethoscope },
            ] as const).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === t.id
                    ? 'bg-white dark:bg-white/[0.1] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}>
                <t.icon className="w-4 h-4" />
                {t.label}
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-200 dark:bg-white/[0.1] text-slate-500 dark:text-slate-400 rounded-full">
                  {tab === t.id
                    ? (t.id === 'medicaments' ? medsTotal.toLocaleString() : pathsTotal.toLocaleString())
                    : '…'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <div className={`flex flex-col border-r border-slate-100 dark:border-white/[0.06] flex-shrink-0 transition-all ${hasDetail ? 'w-[340px]' : 'flex-1'}`}>

          {/* Search + filters */}
          <div className="p-3 border-b border-slate-100 dark:border-white/[0.06] space-y-2 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={tab === 'medicaments' ? 'Rechercher un médicament, DCI…' : 'Rechercher une pathologie, code CIM…'}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-500/40"
              />
            </div>
            {tab === 'pathologies' && (
              <div className="flex items-center gap-2">
                <Filter className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <FilterSelect
                  value={filterCat} onChange={setFilterCat}
                  options={ICD_CHAPTERS} placeholder="Tous les chapitres CIM-10"
                />
              </div>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {tab === 'medicaments' ? (
              medsLoading ? (
                <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Recherche…</div>
              ) : meds.length === 0 ? (
                <EmptyState icon={Pill} text="Aucun médicament trouvé" />
              ) : (
                <div className="p-2 space-y-1">
                  {meds.map(med => (
                    <button key={med.id}
                      onClick={() => { setSelectedMed(med); setSelectedPath(null); }}
                      className={`w-full text-left px-3 py-3 rounded-xl transition-all flex items-center gap-3 ${
                        selectedMed?.id === med.id
                          ? 'bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30'
                          : 'hover:bg-slate-50 dark:hover:bg-white/[0.04] border border-transparent'
                      }`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedMed?.id === med.id ? 'bg-violet-100 dark:bg-violet-500/20' : 'bg-slate-100 dark:bg-white/[0.06]'}`}>
                        <Pill className={`w-4 h-4 ${selectedMed?.id === med.id ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{med.nom_commercial || med.nom}</p>
                        {med.dci && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{med.dci}</p>}
                        {med.forme && <p className="text-[10px] text-slate-400 dark:text-slate-600 truncate">{med.forme}{med.dosage ? ` · ${med.dosage}` : ''}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {med.pays && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                            med.pays === 'MA' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                            : med.pays === 'FR' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30'
                            : 'bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/[0.06]'
                          }`}>{getPaysFlag(med.pays)} {med.pays}</span>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : (
              pathsLoading ? (
                <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Recherche…</div>
              ) : paths.length === 0 ? (
                <EmptyState icon={Stethoscope} text="Aucune pathologie trouvée" />
              ) : (
                <div className="p-2 space-y-1">
                  {paths.map(path => (
                    <button key={path.id}
                      onClick={() => { setSelectedPath(path); setSelectedMed(null); }}
                      className={`w-full text-left px-3 py-3 rounded-xl transition-all flex items-center gap-3 ${
                        selectedPath?.id === path.id
                          ? 'bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30'
                          : 'hover:bg-slate-50 dark:hover:bg-white/[0.04] border border-transparent'
                      }`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedPath?.id === path.id ? 'bg-violet-100 dark:bg-violet-500/20' : 'bg-slate-100 dark:bg-white/[0.06]'}`}>
                        <Stethoscope className={`w-4 h-4 ${selectedPath?.id === path.id ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Nom en français uniquement — nom_en supprimé */}
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{path.nom_fr}</p>
                        {path.categorie && <p className="text-[10px] text-slate-400 dark:text-slate-600 truncate">{path.categorie}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {path.icd10_code && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-500/30 flex items-center gap-0.5">
                            <Hash className="w-2 h-2" />{path.icd10_code}
                          </span>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                      </div>
                    </button>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Pagination */}
          {tab === 'medicaments'
            ? <Pagination page={medsPage} total={medsTotal} pageSize={PAGE_SIZE} onChange={setMedsPage} />
            : <Pagination page={pathsPage} total={pathsTotal} pageSize={PAGE_SIZE} onChange={setPathsPage} />
          }
        </div>

        {/* Right: detail panel */}
        <AnimatePresence mode="wait">
          {hasDetail ? (
            <div className="flex-1 overflow-hidden">
              {selectedMed  && <MedDetail  key={selectedMed.id}  med={selectedMed}   onClose={() => setSelectedMed(null)}  />}
              {selectedPath && <PathDetail key={selectedPath.id} path={selectedPath} onClose={() => setSelectedPath(null)} />}
            </div>
          ) : (
            <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700">
              <BookOpen className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-sm font-medium">Sélectionnez un élément</p>
              <p className="text-xs mt-1 opacity-70">pour afficher les détails</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
