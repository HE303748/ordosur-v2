import { useState, useEffect } from 'react';
import { User, Phone, Mail, MapPin, Calendar } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Patient } from '../lib/supabase';

interface PatientFormProps {
  patient?: Patient | null;
  onSave: (data: Omit<Patient, 'id' | 'org_id' | 'created_at'>) => void;
  onCancel: () => void;
}

export function PatientForm({ patient, onSave, onCancel }: PatientFormProps) {
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    date_naissance: '',
    sexe: 'M' as 'M' | 'F',
    telephone: '',
    email: '',
    adresse: '',
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
      });
    }
  }, [patient]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-h-[calc(100vh-220px)] overflow-y-auto pr-2">

      {/* Identité */}
      <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
        <h3 className="text-sm font-semibold text-primary-900 mb-3 flex items-center">
          <User className="w-4 h-4 mr-2" />
          Identité
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Prénom"
            name="prenom"
            value={formData.prenom}
            onChange={handleChange}
            required
            placeholder="Jean"
          />
          <Input
            label="Nom"
            name="nom"
            value={formData.nom}
            onChange={handleChange}
            required
            placeholder="Dupont"
          />
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
          <Input
            label="Téléphone"
            name="telephone"
            type="tel"
            value={formData.telephone}
            onChange={handleChange}
            placeholder="+33 6 12 34 56 78"
            icon={Phone}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="jean.dupont@email.fr"
            icon={Mail}
          />
          <Input
            label="Adresse"
            name="adresse"
            value={formData.adresse}
            onChange={handleChange}
            placeholder="123 Rue de la Santé, 75001 Paris"
            icon={MapPin}
          />
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
