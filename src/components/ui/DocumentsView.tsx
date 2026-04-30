import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, X, Download, Search, Calendar,
  BriefcaseMedical, Heart, Baby, User, AlertCircle,
  ChevronDown, Loader2,
} from 'lucide-react';
import { supabase, Patient } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { generateDocumentPdf, type DocumentType } from '../../lib/pdfService';
import { PageTransition } from './PageTransition';

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface DocumentRecord {
  id: string;
  type: DocumentType;
  numero: string;
  data: Record<string, string | number | boolean | null>;
  created_at: string;
  patient_id: string | null;
  patient_nom?: string;
  patient_prenom?: string;
}

interface DocumentsViewProps {
  patients: Patient[];
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}

/* ── Config by type ─────────────────────────────────────────────────────────── */
const DOC_CONFIG: Record<DocumentType, { label: string; icon: React.ElementType; color: string; needsPatient: boolean }> = {
  repos:     { label: 'Repos médical',       icon: BriefcaseMedical, color: 'blue',   needsPatient: true  },
  aptitude:  { label: 'Aptitude physique',    icon: Heart,            color: 'green',  needsPatient: true  },
  general:   { label: 'Certificat médical',   icon: FileText,         color: 'purple', needsPatient: true  },
  deces:     { label: 'Certificat de décès',  icon: AlertCircle,      color: 'gray',   needsPatient: false },
  grossesse: { label: 'Certificat grossesse', icon: Baby,             color: 'pink',   needsPatient: true  },
};

const TYPE_COLORS: Record<string, string> = {
  blue:   'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30',
  green:  'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30',
  purple: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-500/20 dark:text-violet-400 dark:border-violet-500/30',
  gray:   'bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/[0.06] dark:text-slate-400 dark:border-white/[0.08]',
  pink:   'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-500/20 dark:text-pink-400 dark:border-pink-500/30',
};

/* ── Field components ───────────────────────────────────────────────────────── */
function FieldInput({ label, name, value, onChange, required, type = 'text', placeholder }: {
  label: string; name: string; value: string; onChange: (n: string, v: string) => void;
  required?: boolean; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(name, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-white/[0.1] rounded-xl bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-500/40"
      />
    </div>
  );
}

function FieldTextarea({ label, name, value, onChange, placeholder, rows = 3 }: {
  label: string; name: string; value: string; onChange: (n: string, v: string) => void;
  placeholder?: string; rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(name, e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-white/[0.1] rounded-xl bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-500/40 resize-none"
      />
    </div>
  );
}

/* ── Modal création ─────────────────────────────────────────────────────────── */
function CreateDocumentModal({
  patients, onClose, onCreated, doctorProfile, orgProfile, logoUrl,
}: {
  patients: Patient[];
  onClose: () => void;
  onCreated: () => void;
  doctorProfile: any;
  orgProfile: any;
  logoUrl?: string | null;
}) {
  const { user } = useAuth();
  const [type, setType] = useState<DocumentType>('repos');
  const [patientId, setPatientId] = useState('');
  const [patSearch, setPatSearch] = useState('');
  const [showPatDrop, setShowPatDrop] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const config = DOC_CONFIG[type];
  const filteredPats = patSearch.length >= 1
    ? patients.filter(p => `${p.prenom} ${p.nom}`.toLowerCase().includes(patSearch.toLowerCase())).slice(0, 20)
    : [];
  const selectedPat = patients.find(p => p.id === patientId);

  const setField = (name: string, value: string) => setFields(f => ({ ...f, [name]: value }));

  // Reset fields when type changes
  const handleTypeChange = (t: DocumentType) => {
    setType(t);
    setFields({});
    if (!DOC_CONFIG[t].needsPatient) {
      setPatientId('');
      setPatSearch('');
    }
  };

  const handleGenerate = async () => {
    setError('');
    if (config.needsPatient && !patientId) { setError('Sélectionnez un patient.'); return; }
    if (type === 'repos' && !fields.duree_jours) { setError('La durée de repos est requise.'); return; }
    if (type === 'aptitude' && !fields.activite) { setError("L'activité est requise."); return; }
    if (type === 'general' && !fields.objet) { setError("L'objet du certificat est requis."); return; }
    if (type === 'deces' && !fields.nom_defunt) { setError('Le nom du défunt est requis.'); return; }
    if (type === 'grossesse' && !fields.terme_sa) { setError('Le terme en SA est requis.'); return; }

    setGenerating(true);
    try {
      // Get next document number
      const { data: numero } = await supabase.rpc('next_document_numero', {
        p_type: type,
        p_org_id: user?.org_id,
      });

      const today = new Date().toISOString().split('T')[0];

      // Save to DB
      const { error: dbErr } = await supabase.from('documents_medicaux').insert({
        org_id: user?.org_id,
        doctor_id: doctorProfile?.id,
        patient_id: patientId || null,
        type,
        numero: numero || `DOC-${Date.now()}`,
        data: {
          ...fields,
          patient_nom: selectedPat?.nom,
          patient_prenom: selectedPat?.prenom,
        },
      });
      if (dbErr) throw dbErr;

      // Generate PDF
      await generateDocumentPdf({
        type,
        numero: numero || `DOC-${Date.now()}`,
        logo_url: logoUrl,
        doctor: {
          prenom: doctorProfile?.full_name?.split(' ')[0] || user?.prenom || '',
          nom: doctorProfile?.full_name?.split(' ').slice(1).join(' ') || user?.nom || '',
          specialite: doctorProfile?.specialite,
          rpps: doctorProfile?.rpps,
        },
        org: {
          name: orgProfile?.name || 'Cabinet',
          adresse: orgProfile?.adresse,
          telephone: orgProfile?.telephone,
        },
        date: today,
        patient: selectedPat
          ? { prenom: selectedPat.prenom, nom: selectedPat.nom, date_naissance: selectedPat.date_naissance }
          : undefined,
        fields: Object.fromEntries(
          Object.entries(fields).map(([k, v]) => [k, v])
        ),
      });

      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18 }}
        className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-white/[0.06]"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-white/[0.06] flex-shrink-0 bg-gradient-to-r from-violet-500 to-purple-600">
          <FileText className="w-5 h-5 text-white" />
          <h2 className="text-white font-bold text-base flex-1">Nouveau document médical</h2>
          <button onClick={onClose} className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Type selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Type de document</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.entries(DOC_CONFIG) as [DocumentType, typeof DOC_CONFIG[DocumentType]][]).map(([t, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button
                    key={t}
                    onClick={() => handleTypeChange(t)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-semibold border-2 transition-all ${
                      type === t
                        ? 'bg-violet-500 text-white border-violet-500 shadow-lg shadow-violet-500/25'
                        : 'border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-slate-400 hover:border-violet-300 dark:hover:border-violet-500/40'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Patient selector */}
          {config.needsPatient && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                Patient <span className="text-red-400">*</span>
              </label>
              {selectedPat ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 rounded-xl">
                  <User className="w-4 h-4 text-violet-500 flex-shrink-0" />
                  <span className="flex-1 text-sm font-semibold text-violet-700 dark:text-violet-300">{selectedPat.prenom} {selectedPat.nom}</span>
                  <button onClick={() => { setPatientId(''); setPatSearch(''); }} className="text-violet-400 hover:text-violet-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    value={patSearch}
                    onChange={e => { setPatSearch(e.target.value); setShowPatDrop(true); }}
                    onFocus={() => setShowPatDrop(true)}
                    onBlur={() => setTimeout(() => setShowPatDrop(false), 200)}
                    placeholder="Rechercher un patient…"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 dark:border-white/[0.1] rounded-xl bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-500/40"
                  />
                  {showPatDrop && filteredPats.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {filteredPats.map(p => (
                        <button
                          key={p.id}
                          onMouseDown={e => { e.preventDefault(); setPatientId(p.id); setPatSearch(''); setShowPatDrop(false); }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-violet-50 dark:hover:bg-violet-500/[0.08] transition-colors border-b border-slate-50 dark:border-white/[0.04] last:border-b-0"
                        >
                          <span className="font-semibold text-slate-900 dark:text-white">{p.prenom} {p.nom}</span>
                          {p.date_naissance && <span className="ml-2 text-xs text-slate-400">{new Date(p.date_naissance).getFullYear()}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Type-specific fields */}
          {type === 'repos' && (
            <div className="space-y-3">
              <FieldInput label="Motif" name="motif" value={fields.motif || ''} onChange={setField} placeholder="Ex: Syndrome grippal, lombalgie aiguë..." />
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="Durée (jours)" name="duree_jours" type="number" value={fields.duree_jours || ''} onChange={setField} required placeholder="3" />
                <FieldInput label="Date début" name="date_debut" type="date" value={fields.date_debut || ''} onChange={setField} />
              </div>
              <FieldInput label="Date fin" name="date_fin" type="date" value={fields.date_fin || ''} onChange={setField} />
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Sortie</label>
                <div className="flex gap-2">
                  {[{ val: 'true', label: 'Autorisée' }, { val: 'false', label: 'Non autorisée' }].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => setField('avec_sortie', opt.val)}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                        fields.avec_sortie === opt.val
                          ? 'bg-sky-500 border-sky-500 text-white'
                          : 'border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <FieldTextarea label="Commentaire" name="commentaire" value={fields.commentaire || ''} onChange={setField} rows={2} />
            </div>
          )}

          {type === 'aptitude' && (
            <div className="space-y-3">
              <FieldInput label="Activité / objet" name="activite" value={fields.activite || ''} onChange={setField} required placeholder="Ex: Sport en compétition, conduite, travail..." />
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Aptitude</label>
                <div className="flex gap-2">
                  {[{ val: 'true', label: 'Apte' }, { val: 'false', label: 'Inapte' }].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => setField('apte', opt.val)}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                        fields.apte === opt.val
                          ? (opt.val === 'true' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-red-500 border-red-500 text-white')
                          : 'border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {fields.apte === 'false' && (
                <FieldInput label="Durée d'inaptitude" name="duree_inapte" value={fields.duree_inapte || ''} onChange={setField} placeholder="Ex: 3 semaines" />
              )}
              <FieldInput label="Réserves éventuelles" name="reserves" value={fields.reserves || ''} onChange={setField} placeholder="Optionnel" />
              <FieldTextarea label="Commentaire" name="commentaire" value={fields.commentaire || ''} onChange={setField} rows={2} />
            </div>
          )}

          {type === 'general' && (
            <div className="space-y-3">
              <FieldInput label="Objet" name="objet" value={fields.objet || ''} onChange={setField} required placeholder="Ex: À présenter à l'employeur, Demande CNSS..." />
              <FieldTextarea label="Contenu du certificat" name="contenu" value={fields.contenu || ''} onChange={setField} rows={5} placeholder="Rédigez ici le contenu du certificat médical..." />
            </div>
          )}

          {type === 'deces' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="Prénom du défunt" name="prenom_defunt" value={fields.prenom_defunt || ''} onChange={setField} placeholder="Mohamed" />
                <FieldInput label="Nom du défunt" name="nom_defunt" value={fields.nom_defunt || ''} onChange={setField} required placeholder="Bensaid" />
              </div>
              <FieldInput label="Date de naissance" name="date_naissance_defunt" type="date" value={fields.date_naissance_defunt || ''} onChange={setField} />
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="Date du décès" name="date_deces" type="date" value={fields.date_deces || ''} onChange={setField} />
                <FieldInput label="Heure" name="heure_deces" type="time" value={fields.heure_deces || ''} onChange={setField} />
              </div>
              <FieldInput label="Lieu du décès" name="lieu_deces" value={fields.lieu_deces || ''} onChange={setField} placeholder="Ex: CHU Ibn Rochd, Casablanca" />
              <FieldInput label="Cause du décès" name="cause" value={fields.cause || ''} onChange={setField} placeholder="Ex: Arrêt cardiorespiratoire" />
              <FieldInput label="Mode de constatation" name="mode" value={fields.mode || ''} onChange={setField} placeholder="Ex: Constaté personnellement" />
            </div>
          )}

          {type === 'grossesse' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="Terme (SA)" name="terme_sa" type="number" value={fields.terme_sa || ''} onChange={setField} required placeholder="28" />
                <FieldInput label="Date d'accouchement prévue" name="date_accouchement" type="date" value={fields.date_accouchement || ''} onChange={setField} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Type de grossesse</label>
                <select
                  value={fields.type_grossesse || ''}
                  onChange={e => setField('type_grossesse', e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-white/[0.1] rounded-xl bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300"
                >
                  <option value="">Sélectionner…</option>
                  <option value="Grossesse simple">Grossesse simple</option>
                  <option value="Grossesse gémellaire">Grossesse gémellaire</option>
                  <option value="Grossesse triple">Grossesse triple</option>
                  <option value="Grossesse à risque">Grossesse à risque</option>
                </select>
              </div>
              <FieldTextarea label="Commentaire" name="commentaire" value={fields.commentaire || ''} onChange={setField} rows={2} />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-xs text-red-700 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/[0.06] flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.1] rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors">
            Annuler
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl hover:from-violet-600 hover:to-purple-700 disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Générer le PDF
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Main DocumentsView ─────────────────────────────────────────────────────── */
export function DocumentsView({ patients, showToast }: DocumentsViewProps) {
  const { user, doctorProfile, clinicProfile } = useAuth();
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');

  const logoUrl = (doctorProfile as any)?.logo_url ?? null;

  const loadDocs = async () => {
    if (!user?.org_id) return;
    setLoading(true);
    const { data } = await supabase
      .from('documents_medicaux')
      .select('id, type, numero, data, created_at, patient_id')
      .eq('org_id', user.org_id)
      .order('created_at', { ascending: false })
      .limit(200);

    if (data) {
      const enriched = (data as DocumentRecord[]).map(d => ({
        ...d,
        patient_nom: (d.data as any)?.patient_nom,
        patient_prenom: (d.data as any)?.patient_prenom,
      }));
      setDocs(enriched);
    }
    setLoading(false);
  };

  useEffect(() => { loadDocs(); }, [user?.org_id]);

  const filtered = docs.filter(d => {
    const matchType = typeFilter === 'all' || d.type === typeFilter;
    const matchSearch = !search ||
      `${d.patient_prenom || ''} ${d.patient_nom || ''}`.toLowerCase().includes(search.toLowerCase()) ||
      d.numero.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const handleRegenerate = async (d: DocumentRecord) => {
    const pat = patients.find(p => p.id === d.patient_id);
    const today = new Date().toISOString().split('T')[0];
    try {
      await generateDocumentPdf({
        type: d.type,
        numero: d.numero,
        logo_url: logoUrl,
        doctor: {
          prenom: (doctorProfile as any)?.full_name?.split(' ')[0] || user?.prenom || '',
          nom: (doctorProfile as any)?.full_name?.split(' ').slice(1).join(' ') || user?.nom || '',
          specialite: (doctorProfile as any)?.specialite,
          rpps: (doctorProfile as any)?.rpps,
        },
        org: {
          name: clinicProfile?.name || 'Cabinet',
          adresse: (clinicProfile as any)?.adresse,
          telephone: (clinicProfile as any)?.telephone,
        },
        date: d.created_at.split('T')[0],
        patient: pat ? { prenom: pat.prenom, nom: pat.nom, date_naissance: pat.date_naissance } : undefined,
        fields: d.data,
      });
      showToast('PDF régénéré');
    } catch {
      showToast('Erreur lors de la génération', 'error');
    }
  };

  return (
    <PageTransition>
      <div className="p-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Documents médicaux</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Certificats, attestations et documents officiels</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-violet-500/25 hover:from-violet-600 hover:to-purple-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            Nouveau document
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par patient ou numéro…"
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-500/40"
            />
          </div>
          <div className="relative">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as DocumentType | 'all')}
              className="appearance-none pl-3 pr-8 py-2.5 text-sm bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-500/40"
            >
              <option value="all">Tous les types</option>
              {(Object.entries(DOC_CONFIG) as [DocumentType, { label: string }][]).map(([t, cfg]) => (
                <option key={t} value={t}>{cfg.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <FileText className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Aucun document trouvé</p>
            <p className="text-xs mt-1 opacity-70">Créez votre premier document médical</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-white/[0.06] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/[0.06]">
                    {['Numéro', 'Type', 'Patient', 'Date', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d, i) => {
                    const cfg = DOC_CONFIG[d.type];
                    const Icon = cfg.icon;
                    return (
                      <tr key={d.id} className={`border-b border-slate-50 dark:border-white/[0.04] last:border-0 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-white/[0.01]'}`}>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300">{d.numero}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${TYPE_COLORS[cfg.color]}`}>
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-900 dark:text-white">
                            {d.patient_prenom || d.patient_nom
                              ? `${d.patient_prenom || ''} ${d.patient_nom || ''}`.trim()
                              : <span className="text-slate-400 italic text-xs">—</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <Calendar className="w-3 h-3" />
                            {new Date(d.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleRegenerate(d)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-lg transition-colors border border-violet-200 dark:border-violet-500/30"
                          >
                            <Download className="w-3 h-3" />
                            PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <CreateDocumentModal
            patients={patients}
            onClose={() => setShowModal(false)}
            onCreated={() => { loadDocs(); showToast('Document créé et PDF généré'); }}
            doctorProfile={doctorProfile}
            orgProfile={clinicProfile}
            logoUrl={logoUrl}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
