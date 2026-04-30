import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, BookOpen, Pill, Activity, AlertTriangle, Zap, ChevronRight,
  Info, Stethoscope, Tag, Globe, FlaskConical, CreditCard, X,
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

/* ── Severity badge ─────────────────────────────────────────────────────────── */
function SeverityBadge({ severite }: { severite: string }) {
  const s = (severite || '').toLowerCase();
  const styles =
    s === 'absolue' || s === 'contre-indication absolue' || s === 'majeure'
      ? 'bg-red-100 text-red-800 border border-red-200'
      : s === 'relative' || s === 'modérée'
      ? 'bg-orange-100 text-orange-800 border border-orange-200'
      : s === 'mineure' || s === 'précaution'
      ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
      : 'bg-slate-100 text-slate-700 border border-slate-200';

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${styles}`}>
      {severite}
    </span>
  );
}

/* ── Empty state ────────────────────────────────────────────────────────────── */
function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <Icon className="w-10 h-10 mb-3 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

/* ── Médicament detail panel ────────────────────────────────────────────────── */
function MedDetail({ med, onClose }: { med: Medicament; onClose: () => void }) {
  const [contras, setContras] = useState<Contraindication[]>([]);
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setContras([]);
      setInteractions([]);
      if (!med.dci) { setLoading(false); return; }

      // Normalise DCI for pattern matching
      const dciLower = med.dci.toLowerCase();

      const [cRes, iRes] = await Promise.all([
        supabase
          .from('contraindications')
          .select('condition_type, condition_valeur, severite, description, mecanisme_fr, conduite_fr')
          .ilike('dci_pattern', `%${dciLower}%`)
          .limit(50),
        supabase
          .from('drug_interactions')
          .select('dci_1_pattern, dci_2_pattern, severite, description')
          .or(`dci_1_pattern.ilike.%${dciLower}%,dci_2_pattern.ilike.%${dciLower}%`)
          .limit(50),
      ]);

      setContras((cRes.data as Contraindication[]) || []);
      setInteractions((iRes.data as DrugInteraction[]) || []);
      setLoading(false);
    };
    load();
  }, [med.id, med.dci]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.18 }}
      className="flex flex-col h-full overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-start gap-3 flex-shrink-0">
        <div className="w-10 h-10 bg-sky-100 dark:bg-sky-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <Pill className="w-5 h-5 text-sky-600 dark:text-sky-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{med.nom_commercial || med.nom}</h2>
          {med.dci && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{med.dci}</p>}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.07] rounded-lg transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Fiche */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Forme', value: med.forme, icon: FlaskConical },
            { label: 'Dosage', value: med.dosage, icon: CreditCard },
            { label: 'Voie', value: med.voie_administration, icon: Activity },
            { label: 'Labo', value: med.laboratoire, icon: Tag },
            { label: 'Classe', value: med.classe_therapeutique, icon: BookOpen },
            { label: 'Pays', value: med.pays, icon: Globe },
          ].map(({ label, value, icon: Icon }) => value ? (
            <div key={label} className="bg-slate-50 dark:bg-white/[0.04] rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</span>
              </div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{value}</p>
            </div>
          ) : null)}
        </div>

        {/* PPV + CNOPS */}
        <div className="flex gap-3">
          {med.ppv_ma != null && (
            <div className="flex-1 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-3 border border-emerald-200 dark:border-emerald-500/20">
              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">PPV Maroc</p>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">{med.ppv_ma.toFixed(2)} MAD</p>
            </div>
          )}
          {med.remboursement_cnops != null && (
            <div className={`flex-1 rounded-xl p-3 border ${
              med.remboursement_cnops
                ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20'
                : 'bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.06]'
            }`}>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">CNOPS</p>
              <p className={`text-sm font-bold mt-0.5 ${med.remboursement_cnops ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}>
                {med.remboursement_cnops ? '✓ Remboursé' : 'Non remboursé'}
              </p>
            </div>
          )}
        </div>

        {/* Contre-indications */}
        {loading ? (
          <div className="text-center py-6 text-slate-400 text-sm">Chargement…</div>
        ) : (
          <>
            <section>
              <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                Contre-indications ({contras.length})
              </h3>
              {contras.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Aucune contre-indication enregistrée.</p>
              ) : (
                <div className="space-y-2">
                  {contras.map((c, i) => (
                    <div key={i} className="bg-red-50 dark:bg-red-500/[0.07] rounded-xl p-3 border border-red-100 dark:border-red-500/20">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-red-800 dark:text-red-300">{c.condition_valeur}</span>
                        <SeverityBadge severite={c.severite} />
                      </div>
                      {c.description && <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{c.description}</p>}
                      {c.mecanisme_fr && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 italic">⚙ {c.mecanisme_fr}</p>
                      )}
                      {c.conduite_fr && (
                        <p className="text-[10px] text-sky-600 dark:text-sky-400 mt-1 font-medium">→ {c.conduite_fr}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-orange-500" />
                Interactions médicamenteuses ({interactions.length})
              </h3>
              {interactions.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Aucune interaction enregistrée.</p>
              ) : (
                <div className="space-y-2">
                  {interactions.map((it, i) => {
                    const partner = med.dci
                      ? (it.dci_1_pattern.toLowerCase().includes(med.dci.toLowerCase())
                        ? it.dci_2_pattern
                        : it.dci_1_pattern)
                      : it.dci_2_pattern;
                    return (
                      <div key={i} className="bg-orange-50 dark:bg-orange-500/[0.07] rounded-xl p-3 border border-orange-100 dark:border-orange-500/20">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-semibold text-orange-800 dark:text-orange-300 capitalize">{partner}</span>
                          <SeverityBadge severite={it.severite} />
                        </div>
                        {it.description && <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{it.description}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </motion.div>
  );
}

/* ── Pathologie detail panel ────────────────────────────────────────────────── */
function PathDetail({ path, onClose }: { path: Pathologie; onClose: () => void }) {
  const [contras, setContras] = useState<Contraindication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setContras([]);

      // Search by condition_valeur matching pathology name
      const searchTerm = path.nom_fr.split(' ')[0]; // use first word
      const { data } = await supabase
        .from('contraindications')
        .select('condition_type, condition_valeur, severite, description, mecanisme_fr, conduite_fr')
        .ilike('condition_valeur', `%${searchTerm}%`)
        .limit(30);

      setContras((data as Contraindication[]) || []);
      setLoading(false);
    };
    load();
  }, [path.id, path.nom_fr]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.18 }}
      className="flex flex-col h-full overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-start gap-3 flex-shrink-0">
        <div className="w-10 h-10 bg-violet-100 dark:bg-violet-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <Stethoscope className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{path.nom_fr}</h2>
          {path.nom_en && <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">{path.nom_en}</p>}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.07] rounded-lg transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          {path.icd10_code && (
            <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 rounded-full text-xs font-bold border border-blue-200 dark:border-blue-500/30">
              CIM-10 : {path.icd10_code}
            </span>
          )}
          {path.categorie && (
            <span className="px-2.5 py-1 bg-violet-100 dark:bg-violet-500/20 text-violet-800 dark:text-violet-300 rounded-full text-xs font-medium border border-violet-200 dark:border-violet-500/30">
              {path.categorie}
            </span>
          )}
        </div>

        {/* Description */}
        {path.description_fr && (
          <div className="bg-slate-50 dark:bg-white/[0.04] rounded-xl p-4 border border-slate-200 dark:border-white/[0.06]">
            <div className="flex items-center gap-1.5 mb-2">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Description</span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{path.description_fr}</p>
          </div>
        )}

        {/* Médicaments contre-indiqués */}
        {loading ? (
          <div className="text-center py-6 text-slate-400 text-sm">Chargement…</div>
        ) : (
          <section>
            <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              Médicaments avec précaution ({contras.length})
            </h3>
            {contras.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Aucune donnée enregistrée.</p>
            ) : (
              <div className="space-y-2">
                {contras.map((c, i) => (
                  <div key={i} className="bg-red-50 dark:bg-red-500/[0.07] rounded-xl p-3 border border-red-100 dark:border-red-500/20">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-red-800 dark:text-red-300 capitalize">{c.condition_valeur}</span>
                      <SeverityBadge severite={c.severite} />
                    </div>
                    {c.description && <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{c.description}</p>}
                    {c.conduite_fr && (
                      <p className="text-[10px] text-sky-600 dark:text-sky-400 mt-1 font-medium">→ {c.conduite_fr}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </motion.div>
  );
}

/* ── Main EncyclopedieView ─────────────────────────────────────────────────── */
type Tab = 'medicaments' | 'pathologies';

export function EncyclopedieView() {
  const [tab, setTab] = useState<Tab>('medicaments');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Médicaments
  const [meds, setMeds] = useState<Medicament[]>([]);
  const [medsLoading, setMedsLoading] = useState(false);
  const [selectedMed, setSelectedMed] = useState<Medicament | null>(null);

  // Pathologies
  const [paths, setPaths] = useState<Pathologie[]>([]);
  const [pathsLoading, setPathsLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState<Pathologie | null>(null);

  /* Debounce */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  /* Reset on tab change */
  useEffect(() => {
    setSearch('');
    setDebouncedSearch('');
    setSelectedMed(null);
    setSelectedPath(null);
  }, [tab]);

  /* ── Search medicaments ── */
  const searchMeds = useCallback(async (q: string) => {
    setMedsLoading(true);
    try {
      if (q.trim().length < 2) {
        // Load initial list alphabetically
        const { data } = await supabase
          .from('medicaments')
          .select('id, nom, dci, forme, dosage, nom_commercial, laboratoire, voie_administration, pays, ppv_ma, classe_therapeutique, remboursement_cnops')
          .order('nom')
          .limit(30);
        setMeds((data as Medicament[]) || []);
      } else {
        const { data } = await supabase.rpc('search_medicaments', { search_query: q });
        setMeds((data as Medicament[]) || []);
      }
    } catch {
      setMeds([]);
    } finally {
      setMedsLoading(false);
    }
  }, []);

  /* ── Search pathologies ── */
  const searchPaths = useCallback(async (q: string) => {
    setPathsLoading(true);
    try {
      const query = supabase
        .from('pathologies')
        .select('id, nom_fr, nom_en, categorie, description_fr, icd10_code')
        .order('nom_fr')
        .limit(50);

      if (q.trim().length >= 1) {
        query.or(`nom_fr.ilike.%${q}%,nom_en.ilike.%${q}%,categorie.ilike.%${q}%`);
      }

      const { data } = await query;
      setPaths((data as Pathologie[]) || []);
    } catch {
      setPaths([]);
    } finally {
      setPathsLoading(false);
    }
  }, []);

  useEffect(() => { if (tab === 'medicaments') searchMeds(debouncedSearch); }, [debouncedSearch, tab, searchMeds]);
  useEffect(() => { if (tab === 'pathologies') searchPaths(debouncedSearch); }, [debouncedSearch, tab, searchPaths]);

  /* ── Initial load ── */
  useEffect(() => { searchMeds(''); }, [searchMeds]);

  const hasDetail = selectedMed || selectedPath;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0A0F1E]">
      {/* ── Page header ── */}
      <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Encyclopédie médicale</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Médicaments, pathologies, contre-indications &amp; interactions</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-white/[0.06] rounded-xl w-fit">
          {([
            { id: 'medicaments', label: 'Médicaments', icon: Pill },
            { id: 'pathologies', label: 'Pathologies', icon: Stethoscope },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t.id
                  ? 'bg-white dark:bg-white/[0.1] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body: list + detail ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: search + list */}
        <div className={`flex flex-col border-r border-slate-100 dark:border-white/[0.06] flex-shrink-0 transition-all ${hasDetail ? 'w-[340px]' : 'flex-1'}`}>
          {/* Search bar */}
          <div className="p-3 border-b border-slate-100 dark:border-white/[0.06] flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={tab === 'medicaments' ? 'Rechercher un médicament…' : 'Rechercher une pathologie…'}
                className="w-full pl-9 pr-4 py-2.5 text-sm
                  bg-slate-50 dark:bg-white/[0.04]
                  border border-slate-200 dark:border-white/[0.08]
                  rounded-xl text-slate-900 dark:text-white
                  placeholder-slate-400 dark:placeholder-slate-600
                  focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-500/40"
              />
            </div>
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
                    <button
                      key={med.id}
                      onClick={() => { setSelectedMed(med); setSelectedPath(null); }}
                      className={`w-full text-left px-3 py-3 rounded-xl transition-all flex items-center gap-3 ${
                        selectedMed?.id === med.id
                          ? 'bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30'
                          : 'hover:bg-slate-50 dark:hover:bg-white/[0.04] border border-transparent'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        selectedMed?.id === med.id ? 'bg-violet-100 dark:bg-violet-500/20' : 'bg-slate-100 dark:bg-white/[0.06]'
                      }`}>
                        <Pill className={`w-4 h-4 ${selectedMed?.id === med.id ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {med.nom_commercial || med.nom}
                        </p>
                        {med.dci && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{med.dci}</p>
                        )}
                        {med.forme && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-600 truncate">{med.forme}{med.dosage ? ` · ${med.dosage}` : ''}</p>
                        )}
                      </div>
                      {med.pays === 'MA' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-500/30 flex-shrink-0">MA</span>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
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
                    <button
                      key={path.id}
                      onClick={() => { setSelectedPath(path); setSelectedMed(null); }}
                      className={`w-full text-left px-3 py-3 rounded-xl transition-all flex items-center gap-3 ${
                        selectedPath?.id === path.id
                          ? 'bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30'
                          : 'hover:bg-slate-50 dark:hover:bg-white/[0.04] border border-transparent'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        selectedPath?.id === path.id ? 'bg-violet-100 dark:bg-violet-500/20' : 'bg-slate-100 dark:bg-white/[0.06]'
                      }`}>
                        <Stethoscope className={`w-4 h-4 ${selectedPath?.id === path.id ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{path.nom_fr}</p>
                        {path.nom_en && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 italic truncate">{path.nom_en}</p>
                        )}
                        {path.categorie && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-600 truncate">{path.categorie}</p>
                        )}
                      </div>
                      {path.icd10_code && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-500/30 flex-shrink-0">
                          {path.icd10_code}
                        </span>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* Right: detail panel */}
        <AnimatePresence mode="wait">
          {hasDetail ? (
            <div className="flex-1 overflow-hidden">
              {selectedMed && (
                <MedDetail key={selectedMed.id} med={selectedMed} onClose={() => setSelectedMed(null)} />
              )}
              {selectedPath && (
                <PathDetail key={selectedPath.id} path={selectedPath} onClose={() => setSelectedPath(null)} />
              )}
            </div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700"
            >
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
