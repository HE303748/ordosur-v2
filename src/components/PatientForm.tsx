import { useState, useEffect, useCallback } from 'react';
import { User, Phone, Mail, MapPin, Calendar, Heart, Plus, X, Pill, Leaf, Scissors, ClipboardList, CreditCard } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Patient, supabase } from '../lib/supabase';

interface PatientFormProps {
  patient?: Patient | null;
  onSave: (data: Omit<Patient, 'id' | 'org_id' | 'created_at'>) => void;
  onCancel: () => void;
}

const GROUPES_SANGUINS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Pathologies courantes en consultation au Maroc — affichées par défaut quand
// le champ est vide. La recherche live serveur prend le relais dès 2 caractères.
const PATHOLOGIES_FALLBACK = [
  'Diabète type 2', 'Hypertension artérielle', 'Dyslipidémie',
  'Asthme', 'BPCO',
  'Insuffisance cardiaque', 'Insuffisance rénale chronique',
  'Hypothyroïdie', 'Hyperthyroïdie',
  'Migraine', 'Reflux gastro-œsophagien',
  'Dépression', 'Anxiété', 'Épilepsie',
];
const ALLERGIES_MED_FALLBACK = [
  'Allergie aux Pénicillines', 'Allergie aux Céphalosporines', 'Allergie aux AINS',
  'Allergie à l\'Aspirine', 'Allergie aux Macrolides', 'Allergie aux Fluoroquinolones',
  'Allergie à la Morphine', 'Allergie aux Statines', 'Allergie aux IEC',
];
const ALLERGIES_ALIM_FALLBACK = [
  'Allergie aux Arachides', 'Allergie aux Noix', 'Allergie au Lait de vache',
  'Allergie aux Œufs', 'Allergie au Blé/Gluten', 'Allergie au Soja',
  'Allergie aux Crustacés', 'Allergie aux Poissons',
];

function BadgeSelector({
  label,
  icon: Icon,
  color,
  suggestions,
  values,
  onChange,
  placeholder,
  asyncSearch,
}: {
  label: string;
  icon: React.ElementType;
  color: string;
  suggestions: string[];
  values: string[];
  onChange: (vals: string[]) => void;
  placeholder: string;
  // Sprint Quick Fix B — recherche server-side optionnelle (utilisée pour pathologies).
  // Si absente, filtre client-side sur `suggestions` (comportement original — allergies).
  asyncSearch?: (q: string) => Promise<string[]>;
}) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [asyncResults, setAsyncResults] = useState<string[]>([]);

  // Debounce 250ms pour ne pas spammer la DB à chaque caractère
  useEffect(() => {
    if (!asyncSearch) return;
    const q = input.trim();
    if (q.length < 2) {
      setAsyncResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await asyncSearch(q);
        setAsyncResults(results);
      } catch {
        setAsyncResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [input, asyncSearch]);

  // Empty input → fallback suggestions. Sinon : async results si fournis, sinon filtre client.
  const filteredSuggestions = (() => {
    if (asyncSearch) {
      if (input.trim().length < 2) {
        return suggestions.filter(s => !values.includes(s)).slice(0, 8);
      }
      return asyncResults.filter(s => !values.includes(s));
    }
    return input.length >= 1
      ? suggestions.filter(s => s.toLowerCase().includes(input.toLowerCase()) && !values.includes(s))
      : suggestions.filter(s => !values.includes(s)).slice(0, 8);
  })();

  const add = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput('');
    setShowSuggestions(false);
  };

  const remove = (val: string) => onChange(values.filter(v => v !== val));

  const colorMap: Record<string, { badge: string; btn: string; border: string }> = {
    red:    { badge: 'bg-red-100 text-red-800 border border-red-200',       btn: 'text-red-500 hover:bg-red-200',       border: 'border-red-200 bg-red-50' },
    orange: { badge: 'bg-orange-100 text-orange-800 border border-orange-200', btn: 'text-orange-500 hover:bg-orange-200', border: 'border-orange-200 bg-orange-50' },
    blue:   { badge: 'bg-blue-100 text-blue-800 border border-blue-200',    btn: 'text-blue-500 hover:bg-blue-200',    border: 'border-blue-200 bg-blue-50' },
    green:  { badge: 'bg-green-100 text-green-800 border border-green-200', btn: 'text-green-500 hover:bg-green-200', border: 'border-green-200 bg-green-50' },
    violet: { badge: 'bg-violet-100 text-violet-800 border border-violet-200', btn: 'text-violet-500 hover:bg-violet-200', border: 'border-violet-200 bg-violet-50' },
  };
  const c = colorMap[color];

  return (
    <div className={`rounded-lg p-4 border ${c.border}`}>
      <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </h4>

      {/* Badges existants */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {values.map(v => (
            <span key={v} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.badge}`}>
              {v}
              <button type="button" onClick={() => remove(v)} className={`rounded-full p-0.5 transition-colors ${c.btn}`}>
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input + suggestions */}
      <div className="relative">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (input.trim()) add(input); } }}
            placeholder={placeholder}
            className="flex-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none bg-white"
          />
          <button
            type="button"
            onClick={() => { if (input.trim()) add(input); }}
            className="px-2.5 py-1.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {filteredSuggestions.map(s => (
              <button
                key={s}
                type="button"
                onMouseDown={e => { e.preventDefault(); add(s); }}
                className="w-full px-3 py-1.5 text-left text-xs hover:bg-primary-50 transition-colors border-b border-gray-100 last:border-b-0"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function PatientForm({ patient, onSave, onCancel }: PatientFormProps) {
  // ── DB suggestions ──────────────────────────────────────────────────────
  // Sprint Quick Fix B : les pathologies (48k lignes) ne sont PLUS chargées en bulk
  // (la limite par défaut 1000 de Supabase tronquait la liste alphabétiquement).
  // Recherche live serveur via searchPathologies ci-dessous. Le fallback hardcoded
  // (PATHOLOGIES_FALLBACK) sert d'état vide / suggestions par défaut.
  const dbPathologies = PATHOLOGIES_FALLBACK;
  const [dbAllergiesMed, setDbAllergiesMed] = useState<string[]>(ALLERGIES_MED_FALLBACK);
  const [dbAllergiesAlim, setDbAllergiesAlim] = useState<string[]>(ALLERGIES_ALIM_FALLBACK);

  useEffect(() => {
    const load = async () => {
      // Allergies : tables petites, comportement inchangé (chargement initial + filtre client)
      const [medRes, alimRes] = await Promise.all([
        supabase.from('allergies_reference').select('nom_fr').eq('type', 'medicamenteuse').order('nom_fr'),
        supabase.from('allergies_reference').select('nom_fr').eq('type', 'alimentaire').order('nom_fr'),
      ]);
      if (medRes.data?.length)  setDbAllergiesMed(medRes.data.map(r => r.nom_fr));
      if (alimRes.data?.length) setDbAllergiesAlim(alimRes.data.map(r => r.nom_fr));
    };
    load();
  }, []);

  // Recherche pathologies server-side sur la table curée `pathologies_curees`
  // (372 libellés FR propres). Tolère les requêtes en anglais / abréviations via la
  // colonne `synonymes` (jamais affichée), mais affiche STRICTEMENT `nom_fr`.
  // Limit 30 pour ne pas surcharger le dropdown.
  const searchPathologies = useCallback(async (q: string): Promise<string[]> => {
    // Sanitize : strip `%` et `,` pour éviter d'injecter dans le pattern ilike / la syntaxe .or()
    const sanitized = q.replace(/[%,]/g, '').trim();
    if (!sanitized) return [];
    const { data } = await supabase
      .from('pathologies_curees')
      .select('nom_fr')
      .or(`nom_fr.ilike.%${sanitized}%,synonymes.ilike.%${sanitized}%`)
      .order('nom_fr')
      .limit(30);
    return (data ?? []).map(r => r.nom_fr).filter((v): v is string => Boolean(v));
  }, []);

  // ── Form state ──────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    date_naissance: '',
    sexe: 'M' as 'M' | 'F',
    telephone: '',
    email: '',
    adresse: '',
    cnie: '',
    pathologies: [] as string[],
    allergies_medicaments: [] as string[],
    allergies_alimentaires: [] as string[],
    groupe_sanguin: '',
    antecedents_chirurgicaux: '',
    traitements_en_cours: '',
  });

  useEffect(() => {
    if (patient) {
      setFormData({
        prenom: patient.prenom ?? '',
        nom: patient.nom ?? '',
        date_naissance: patient.date_naissance ?? '',
        sexe: patient.sexe ?? 'M',
        telephone: patient.telephone ?? '',
        email: patient.email ?? '',
        adresse: patient.adresse ?? '',
        cnie: patient.cnie ?? '',
        pathologies: patient.pathologies ?? [],
        allergies_medicaments: patient.allergies_medicaments ?? [],
        allergies_alimentaires: patient.allergies_alimentaires ?? [],
        groupe_sanguin: patient.groupe_sanguin ?? '',
        antecedents_chirurgicaux: patient.antecedents_chirurgicaux ?? '',
        traitements_en_cours: patient.traitements_en_cours ?? '',
      });
    }
  }, [patient]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      prenom: formData.prenom.trim(),
      nom: formData.nom.trim(),
      date_naissance: formData.date_naissance || null,
      sexe: formData.sexe,
      telephone: formData.telephone.trim() || null,
      email: formData.email.trim() || null,
      adresse: formData.adresse.trim() || null,
      cnie: formData.cnie.trim() || null,
      pathologies: formData.pathologies.length > 0 ? formData.pathologies : null,
      allergies_medicaments: formData.allergies_medicaments.length > 0 ? formData.allergies_medicaments : null,
      allergies_alimentaires: formData.allergies_alimentaires.length > 0 ? formData.allergies_alimentaires : null,
      groupe_sanguin: formData.groupe_sanguin || null,
      antecedents_chirurgicaux: formData.antecedents_chirurgicaux.trim() || null,
      traitements_en_cours: formData.traitements_en_cours.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto pr-2">

      {/* Identité */}
      <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
        <h3 className="text-sm font-semibold text-primary-900 mb-3 flex items-center">
          <User className="w-4 h-4 mr-2" />
          Identité
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Prénom" name="prenom" value={formData.prenom} onChange={handleChange} required placeholder="Jean" />
          <Input label="Nom" name="nom" value={formData.nom} onChange={handleChange} required placeholder="Dupont" />
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1" />
              Date de naissance
            </label>
            <input
              type="date"
              name="date_naissance"
              value={formData.date_naissance}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sexe</label>
            <div className="flex space-x-2 mt-1">
              {(['M', 'F'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, sexe: s }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                    formData.sexe === s
                      ? 'bg-primary-500 border-primary-500 text-white'
                      : 'border-gray-300 text-gray-600 hover:border-primary-400'
                  }`}
                >
                  {s === 'M' ? 'Homme' : 'Femme'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
          <Phone className="w-4 h-4 mr-2" />
          Coordonnées
        </h3>
        <div className="space-y-3">
          <Input label="Téléphone" name="telephone" type="tel" value={formData.telephone} onChange={handleChange} placeholder="+212 6XX XXX XXX" icon={Phone} />
          <Input label="Email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="patient@email.ma" icon={Mail} />
          <Input label="Adresse" name="adresse" value={formData.adresse} onChange={handleChange} placeholder="123 Bd Mohammed V, Casablanca" icon={MapPin} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              CNIE <span className="text-gray-400 font-normal">(Carte d'identité nationale)</span>
            </label>
            <input
              type="text"
              name="cnie"
              value={formData.cnie}
              onChange={handleChange}
              placeholder="AB123456"
              maxLength={20}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
            />
          </div>
        </div>
      </div>

      {/* Informations médicales */}
      <div className="bg-white rounded-lg p-4 border-2 border-rose-100">
        <h3 className="text-sm font-semibold text-rose-900 mb-3 flex items-center">
          <Heart className="w-4 h-4 mr-2 text-rose-500" />
          Informations médicales
        </h3>

        <div className="space-y-3">

          {/* Groupe sanguin */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Groupe sanguin</label>
            <div className="flex flex-wrap gap-1.5">
              {GROUPES_SANGUINS.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, groupe_sanguin: prev.groupe_sanguin === g ? '' : g }))}
                  className={`px-3 py-1 rounded-full text-xs font-bold border-2 transition-all ${
                    formData.groupe_sanguin === g
                      ? 'bg-rose-500 border-rose-500 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-rose-300 bg-white'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Pathologies */}
          <BadgeSelector
            label="Pathologies chroniques"
            icon={Heart}
            color="violet"
            suggestions={dbPathologies}
            asyncSearch={searchPathologies}
            values={formData.pathologies}
            onChange={v => setFormData(prev => ({ ...prev, pathologies: v }))}
            placeholder="Rechercher une pathologie..."
          />

          {/* Allergies médicaments */}
          <BadgeSelector
            label="Allergies médicamenteuses"
            icon={Pill}
            color="red"
            suggestions={dbAllergiesMed}
            values={formData.allergies_medicaments}
            onChange={v => setFormData(prev => ({ ...prev, allergies_medicaments: v }))}
            placeholder="Ajouter une allergie médicamenteuse..."
          />

          {/* Allergies alimentaires */}
          <BadgeSelector
            label="Allergies alimentaires"
            icon={Leaf}
            color="orange"
            suggestions={dbAllergiesAlim}
            values={formData.allergies_alimentaires}
            onChange={v => setFormData(prev => ({ ...prev, allergies_alimentaires: v }))}
            placeholder="Ajouter une allergie alimentaire..."
          />

          {/* Antécédents chirurgicaux */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5" />
              Antécédents chirurgicaux
            </label>
            <textarea
              name="antecedents_chirurgicaux"
              value={formData.antecedents_chirurgicaux}
              onChange={handleChange}
              rows={2}
              placeholder="Ex: appendicectomie 2015, prothèse hanche gauche 2020..."
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none resize-none"
            />
          </div>

          {/* Traitements en cours */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" />
              Traitements en cours
            </label>
            <textarea
              name="traitements_en_cours"
              value={formData.traitements_en_cours}
              onChange={handleChange}
              rows={2}
              placeholder="Ex: Metformine 500mg 2x/j, Bisoprolol 5mg 1x/j..."
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none resize-none"
            />
          </div>

        </div>
      </div>

      <div className="flex space-x-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Annuler
        </Button>
        <Button type="submit" className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600">
          {patient ? 'Mettre à jour' : 'Ajouter le patient'}
        </Button>
      </div>
    </form>
  );
}
