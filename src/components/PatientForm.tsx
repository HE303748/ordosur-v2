import { useState, useEffect } from 'react';
import { Activity, Heart, Droplets, AlertTriangle, User, Weight, Ruler, TestTube } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Patient } from '../lib/supabase';

interface PatientFormProps {
  patient?: Patient | null;
  onSave: (data: Omit<Patient, 'id' | 'doctor_id' | 'created_at'>) => void;
  onCancel: () => void;
}

const pathologiesOptions = [
  { value: 'Diabète Type 1', icon: Droplets, color: 'danger' },
  { value: 'Diabète Type 2', icon: Droplets, color: 'caution' },
  { value: 'Insuffisance Rénale Chronique', icon: AlertTriangle, color: 'danger' },
  { value: 'Hypertension Artérielle', icon: Activity, color: 'caution' },
  { value: 'Maladie Cardiaque', icon: Heart, color: 'danger' },
  { value: 'Insuffisance Hépatique', icon: AlertTriangle, color: 'danger' },
  { value: 'Asthme/BPCO', icon: Activity, color: 'caution' },
  { value: 'Épilepsie', icon: Activity, color: 'caution' },
  { value: 'Grossesse', icon: AlertTriangle, color: 'caution' },
  { value: 'Allaitement', icon: AlertTriangle, color: 'caution' },
];

const allergiesPredefines = [
  'Pénicilline (et dérivés)',
  'Sulfamides',
  'Aspirine/AINS',
  'Iode (produits de contraste)',
  'Codéine/Morphiniques',
];

export function PatientForm({ patient, onSave, onCancel }: PatientFormProps) {
  const [formData, setFormData] = useState({
    nom_complet: '',
    age: '',
    sexe: 'Homme' as 'Homme' | 'Femme',
    poids: '',
    taille: '',
    creatinine: '',
    maladies_chroniques: [] as string[],
    autres_maladies: '',
    allergies: [] as string[],
    autre_allergie: '',
  });

  const [imc, setImc] = useState<number | null>(null);

  useEffect(() => {
    if (patient) {
      const autresMaladies = patient.maladies_chroniques.filter(
        m => !pathologiesOptions.some(opt => opt.value === m)
      );

      const allergiesPredefinies = patient.allergies.filter(a =>
        allergiesPredefines.some(predefined => a === predefined)
      );
      const autresAllergies = patient.allergies.filter(a =>
        !allergiesPredefines.some(predefined => a === predefined)
      );

      setFormData({
        nom_complet: patient.nom_complet,
        age: patient.age.toString(),
        sexe: patient.sexe,
        poids: patient.poids?.toString() || '',
        taille: patient.taille?.toString() || '',
        creatinine: patient.creatinine?.toString() || '',
        maladies_chroniques: patient.maladies_chroniques.filter(m =>
          pathologiesOptions.some(opt => opt.value === m)
        ),
        autres_maladies: autresMaladies.join(', '),
        allergies: allergiesPredefinies,
        autre_allergie: autresAllergies.join(', '),
      });

      if (patient.poids && patient.taille) {
        const calculatedImc = patient.poids / Math.pow(patient.taille / 100, 2);
        setImc(calculatedImc);
      }
    }
  }, [patient]);

  useEffect(() => {
    if (formData.poids && formData.taille) {
      const poids = parseFloat(formData.poids);
      const taille = parseFloat(formData.taille);
      if (poids > 0 && taille > 0) {
        const calculatedImc = poids / Math.pow(taille / 100, 2);
        setImc(calculatedImc);
      }
    } else {
      setImc(null);
    }
  }, [formData.poids, formData.taille]);

  const handlePathologieToggle = (pathologie: string) => {
    setFormData(prev => ({
      ...prev,
      maladies_chroniques: prev.maladies_chroniques.includes(pathologie)
        ? prev.maladies_chroniques.filter(m => m !== pathologie)
        : [...prev.maladies_chroniques, pathologie]
    }));
  };

  const handleAllergieToggle = (allergie: string) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.includes(allergie)
        ? prev.allergies.filter(a => a !== allergie)
        : [...prev.allergies, allergie]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const allMaladies = [...formData.maladies_chroniques];
    if (formData.autres_maladies.trim()) {
      allMaladies.push(...formData.autres_maladies.split(',').map(m => m.trim()).filter(Boolean));
    }

    const allAllergies = [...formData.allergies];
    if (formData.autre_allergie.trim()) {
      allAllergies.push(...formData.autre_allergie.split(',').map(a => a.trim()).filter(Boolean));
    }

    const calculatedDfg = formData.creatinine && formData.age ?
      calculateDFG(parseFloat(formData.creatinine), parseInt(formData.age), formData.sexe) : undefined;

    onSave({
      nom_complet: formData.nom_complet,
      age: parseInt(formData.age),
      sexe: formData.sexe,
      poids: formData.poids ? parseFloat(formData.poids) : undefined,
      taille: formData.taille ? parseInt(formData.taille) : undefined,
      creatinine: formData.creatinine ? parseFloat(formData.creatinine) : undefined,
      imc: imc || undefined,
      dfg: calculatedDfg,
      maladies_chroniques: allMaladies,
      allergies: allAllergies,
    });
  };

  const calculateDFG = (creatinine: number, age: number, sexe: 'Homme' | 'Femme'): number => {
    const k = sexe === 'Femme' ? 0.85 : 1;
    return Math.round(((140 - age) / creatinine) * k);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
      <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
        <h3 className="text-sm font-semibold text-primary-900 mb-3 flex items-center">
          <User className="w-4 h-4 mr-2" />
          Informations de Base
        </h3>
        <div className="space-y-3">
          <Input
            label="Nom Complet"
            value={formData.nom_complet}
            onChange={(e) => setFormData({ ...formData, nom_complet: e.target.value })}
            required
            placeholder="Ex: Marie Dupont"
          />

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Âge"
              type="number"
              min="1"
              max="150"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              required
              placeholder="45"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sexe</label>
              <div className="flex space-x-2">
                <label className={`flex-1 flex items-center justify-center px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                  formData.sexe === 'Homme' ? 'bg-primary-100 border-primary-500' : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="sexe"
                    value="Homme"
                    checked={formData.sexe === 'Homme'}
                    onChange={(e) => setFormData({ ...formData, sexe: e.target.value as 'Homme' | 'Femme' })}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">Homme</span>
                </label>
                <label className={`flex-1 flex items-center justify-center px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                  formData.sexe === 'Femme' ? 'bg-primary-100 border-primary-500' : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="sexe"
                    value="Femme"
                    checked={formData.sexe === 'Femme'}
                    onChange={(e) => setFormData({ ...formData, sexe: e.target.value as 'Homme' | 'Femme' })}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">Femme</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Weight className="w-3 h-3 inline mr-1" />
                Poids (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="20"
                max="300"
                value={formData.poids}
                onChange={(e) => setFormData({ ...formData, poids: e.target.value })}
                placeholder="70"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Ruler className="w-3 h-3 inline mr-1" />
                Taille (cm)
              </label>
              <input
                type="number"
                min="50"
                max="250"
                value={formData.taille}
                onChange={(e) => setFormData({ ...formData, taille: e.target.value })}
                placeholder="170"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
              />
            </div>

            {imc && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IMC</label>
                <div className={`px-3 py-2 rounded-lg text-sm font-semibold text-center ${
                  imc < 18.5 ? 'bg-caution-100 text-caution-700' :
                  imc < 25 ? 'bg-safe-100 text-safe-700' :
                  imc < 30 ? 'bg-caution-100 text-caution-700' :
                  'bg-danger-100 text-danger-700'
                }`}>
                  {imc.toFixed(1)}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <TestTube className="w-3 h-3 inline mr-1" />
                Créatinine (mg/dL)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                max="20"
                value={formData.creatinine}
                onChange={(e) => setFormData({ ...formData, creatinine: e.target.value })}
                placeholder="1.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-danger-50 rounded-lg p-4 border border-danger-200">
        <h3 className="text-sm font-semibold text-danger-900 mb-3 flex items-center">
          <AlertTriangle className="w-4 h-4 mr-2" />
          Pathologies Chroniques
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {pathologiesOptions.map((pathologie) => {
            const Icon = pathologie.icon;
            const isSelected = formData.maladies_chroniques.includes(pathologie.value);
            return (
              <label
                key={pathologie.value}
                className={`flex items-center space-x-2 p-3 rounded-lg cursor-pointer transition-all border-2 ${
                  isSelected
                    ? pathologie.color === 'danger'
                      ? 'bg-danger-100 border-danger-500'
                      : 'bg-caution-100 border-caution-500'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handlePathologieToggle(pathologie.value)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <Icon className={`w-4 h-4 flex-shrink-0 ${
                  isSelected
                    ? pathologie.color === 'danger'
                      ? 'text-danger-600'
                      : 'text-caution-600'
                    : 'text-gray-400'
                }`} />
                <span className={`text-xs ${isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                  {pathologie.value}
                </span>
              </label>
            );
          })}
        </div>
        <Input
          label="Autre pathologie"
          value={formData.autres_maladies}
          onChange={(e) => setFormData({ ...formData, autres_maladies: e.target.value })}
          placeholder="Séparer par des virgules"
          className="mt-3"
        />
      </div>

      <div className="bg-danger-50 rounded-lg p-4 border border-danger-200">
        <h3 className="text-sm font-semibold text-danger-900 mb-3 flex items-center">
          ⚠️ Allergies Médicamenteuses
        </h3>
        <div className="space-y-2">
          {allergiesPredefines.map((allergie) => {
            const isSelected = formData.allergies.includes(allergie);
            return (
              <label
                key={allergie}
                className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all border-2 ${
                  isSelected
                    ? 'bg-danger-100 border-danger-500'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleAllergieToggle(allergie)}
                  className="w-4 h-4 text-danger-600 border-gray-300 rounded focus:ring-danger-500"
                />
                <span className={`text-sm flex-1 ${isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                  {allergie}
                </span>
                {isSelected && <span className="text-danger-600 font-bold">⚠️</span>}
              </label>
            );
          })}
        </div>
        <Input
          label="Autre allergie"
          value={formData.autre_allergie}
          onChange={(e) => setFormData({ ...formData, autre_allergie: e.target.value })}
          placeholder="Séparer par des virgules"
          className="mt-3"
        />
      </div>

      <div className="flex space-x-3 pt-4 border-t sticky bottom-0 bg-white">
        <Button type="submit" variant="primary" className="flex-1">
          Enregistrer
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Annuler
        </Button>
      </div>
    </form>
  );
}
