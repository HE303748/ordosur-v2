import { useState, useEffect } from 'react';
import { User, Mail, Phone, Calendar, Briefcase, Shield } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';

export interface DoctorData {
  id?: string;
  nom: string;
  prenom: string;
  titre: string;
  specialites: string[];
  email: string;
  telephone: string;
  telephone_mobile?: string;
  rpps: string;
  date_entree: string;
  service?: string;
  jours_consultation: string[];
  horaire_debut: string;
  horaire_fin: string;
  role: 'doctor' | 'doctor_chef' | 'admin';
  statut: 'actif' | 'conge' | 'inactif';
  notes?: string;
}

interface DoctorFormProps {
  doctor?: DoctorData | null;
  onSave: (data: DoctorData) => void;
  onCancel: () => void;
}

const specialitesOptions = [
  'Médecine Générale',
  'Cardiologie',
  'Néphrologie',
  'Endocrinologie',
  'Pneumologie',
  'Neurologie',
  'Gastro-entérologie',
  'Rhumatologie',
  'Gériatrie',
  'Pédiatrie',
  'Psychiatrie',
  'Dermatologie',
  'Urgentiste',
  'Anesthésiste',
  'Chirurgie Générale',
];

const joursOptions = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export function DoctorForm({ doctor, onSave, onCancel }: DoctorFormProps) {
  const [formData, setFormData] = useState<DoctorData>({
    nom: '',
    prenom: '',
    titre: 'Dr.',
    specialites: [],
    email: '',
    telephone: '+212 ',
    telephone_mobile: '',
    rpps: '',
    date_entree: new Date().toISOString().split('T')[0],
    service: '',
    jours_consultation: [],
    horaire_debut: '09:00',
    horaire_fin: '17:00',
    role: 'doctor',
    statut: 'actif',
    notes: '',
  });

  const [autreSpecialite, setAutreSpecialite] = useState('');

  useEffect(() => {
    if (doctor) {
      setFormData(doctor);
    }
  }, [doctor]);

  const handleSpecialiteToggle = (specialite: string) => {
    setFormData(prev => ({
      ...prev,
      specialites: prev.specialites.includes(specialite)
        ? prev.specialites.filter(s => s !== specialite)
        : [...prev.specialites, specialite]
    }));
  };

  const handleJourToggle = (jour: string) => {
    setFormData(prev => ({
      ...prev,
      jours_consultation: prev.jours_consultation.includes(jour)
        ? prev.jours_consultation.filter(j => j !== jour)
        : [...prev.jours_consultation, jour]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalSpecialites = [...formData.specialites];
    if (autreSpecialite.trim()) {
      finalSpecialites.push(autreSpecialite.trim());
    }

    onSave({
      ...formData,
      specialites: finalSpecialites,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
      <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
        <h3 className="text-sm font-semibold text-primary-900 mb-3 flex items-center">
          <User className="w-4 h-4 mr-2" />
          Informations Personnelles
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
              <select
                value={formData.titre}
                onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
              >
                <option value="Dr.">Dr.</option>
                <option value="Pr.">Pr.</option>
              </select>
            </div>
            <Input
              label="Nom *"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              required
              placeholder="Dupont"
            />
            <Input
              label="Prénom *"
              value={formData.prenom}
              onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
              required
              placeholder="Laurent"
            />
          </div>
        </div>
      </div>

      <div className="bg-secondary-50 rounded-lg p-4 border border-secondary-200">
        <h3 className="text-sm font-semibold text-secondary-900 mb-3 flex items-center">
          <Briefcase className="w-4 h-4 mr-2" />
          Spécialité(s) *
        </h3>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {specialitesOptions.map((specialite) => {
            const isSelected = formData.specialites.includes(specialite);
            return (
              <label
                key={specialite}
                className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-secondary-100 border-secondary-500'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleSpecialiteToggle(specialite)}
                  className="w-4 h-4 text-secondary-600 border-gray-300 rounded focus:ring-secondary-500"
                />
                <span className={`text-xs ${isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                  {specialite}
                </span>
              </label>
            );
          })}
        </div>
        <Input
          label="Autre spécialité"
          value={autreSpecialite}
          onChange={(e) => setAutreSpecialite(e.target.value)}
          placeholder="Spécialité non listée"
        />
      </div>

      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
          <Mail className="w-4 h-4 mr-2" />
          Coordonnées Professionnelles
        </h3>
        <div className="space-y-3">
          <Input
            label="Email professionnel *"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            placeholder="prenom.nom@gmail.com"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Téléphone *"
              type="tel"
              value={formData.telephone}
              onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
              required
              placeholder="+212 6 12 34 56 78"
            />
            <Input
              label="Téléphone mobile"
              type="tel"
              value={formData.telephone_mobile}
              onChange={(e) => setFormData({ ...formData, telephone_mobile: e.target.value })}
              placeholder="+212 6 12 34 56 78"
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
          <Calendar className="w-4 h-4 mr-2" />
          Informations Professionnelles
        </h3>
        <div className="space-y-3">
          <Input
            label="Numéro RPPS *"
            value={formData.rpps}
            onChange={(e) => setFormData({ ...formData, rpps: e.target.value })}
            required
            placeholder="10003456789 (11 chiffres)"
            maxLength={11}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date d'entrée *"
              type="date"
              value={formData.date_entree}
              onChange={(e) => setFormData({ ...formData, date_entree: e.target.value })}
              required
            />
            <Input
              label="Service/Département"
              value={formData.service}
              onChange={(e) => setFormData({ ...formData, service: e.target.value })}
              placeholder="Service de Cardiologie"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Jours de consultation</label>
            <div className="grid grid-cols-4 gap-2">
              {joursOptions.map((jour) => {
                const isSelected = formData.jours_consultation.includes(jour);
                return (
                  <button
                    key={jour}
                    type="button"
                    onClick={() => handleJourToggle(jour)}
                    className={`flex items-center justify-center p-2 rounded-lg cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-primary-100 border-primary-500'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className={`text-xs ${isSelected ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                      {jour}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
          <Shield className="w-4 h-4 mr-2" />
          Accès et Permissions
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rôle *</label>
            <div className="space-y-2">
              {[
                { value: 'doctor', label: 'Médecin', desc: 'accès dashboard médecin seulement' },
                { value: 'doctor_chef', label: 'Médecin Chef', desc: 'accès + statistiques équipe' },
                { value: 'admin', label: 'Administrateur', desc: 'accès complet' },
              ].map((role) => (
                <label
                  key={role.value}
                  className={`flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-all border ${
                    formData.role === role.value
                      ? 'bg-primary-100 border-primary-500'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role.value}
                    checked={formData.role === role.value}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="mt-0.5"
                  />
                  <div>
                    <div className={`text-sm font-medium ${formData.role === role.value ? 'text-gray-900' : 'text-gray-700'}`}>
                      {role.label}
                    </div>
                    <div className="text-xs text-gray-500">{role.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Statut *</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'actif', label: 'Actif', bgClass: 'bg-green-100', borderClass: 'border-green-500' },
                { value: 'conge', label: 'En congé', bgClass: 'bg-yellow-100', borderClass: 'border-yellow-500' },
                { value: 'inactif', label: 'Inactif', bgClass: 'bg-red-100', borderClass: 'border-red-500' },
              ].map((statut) => (
                <button
                  key={statut.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, statut: statut.value as any })}
                  className={`flex items-center justify-center p-3 rounded-lg cursor-pointer transition-all border-2 ${
                    formData.statut === statut.value
                      ? `${statut.bgClass} ${statut.borderClass}`
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className={`text-sm font-medium ${formData.statut === statut.value ? 'text-gray-900' : 'text-gray-700'}`}>
                    {statut.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes supplémentaires..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm resize-none"
            />
          </div>
        </div>
      </div>

      <div className="flex space-x-3 pt-4 border-t sticky bottom-0 bg-white">
        <Button type="submit" variant="primary" className="flex-1">
          Enregistrer le Médecin
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Annuler
        </Button>
      </div>
    </form>
  );
}
