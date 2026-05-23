import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './Button';
import { Input } from './Input';
import { Modal } from './Modal';
import { User, Mail, Phone, FileText, Briefcase, Copy, CheckCircle, Shield } from 'lucide-react';

interface CreateDoctorAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinicId: string;
  onSuccess: () => void;
}

const SPECIALITIES = [
  'Médecin généraliste',
  'Cardiologue',
  'Pédiatre',
  'Chirurgien',
  'Pharmacien',
  'Dermatologue',
  'Ophtalmologue',
  'Gynécologue',
  'Psychiatre',
  'Radiologue',
  'Autre'
];

export function CreateDoctorAccountModal({
  isOpen,
  onClose,
  clinicId,
  onSuccess
}: CreateDoctorAccountModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdAccount, setCreatedAccount] = useState<{
    email: string;
    temporaryPassword: string;
    expiresAt: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    specialization: '',
    rpps_number: '',
    phone_number: '',
    medical_license_number: '',
  });

  function resetForm() {
    setFormData({
      email: '',
      full_name: '',
      specialization: '',
      rpps_number: '',
      phone_number: '',
      medical_license_number: '',
    });
    setError('');
    setCreatedAccount(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session non valide');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/create-doctor-account`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim(),
          full_name: formData.full_name.trim(),
          specialization: [formData.specialization],
          rpps_number: formData.rpps_number.trim(),
          phone_number: formData.phone_number.trim(),
          medical_license_number: formData.medical_license_number.trim(),
          clinic_id: clinicId,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la création du compte');
      }

      setCreatedAccount({
        email: result.email,
        temporaryPassword: result.temporary_password,
        expiresAt: result.password_expires_at,
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error creating doctor account:', error);
      setError(error.message || 'Erreur lors de la création du compte médecin');
    } finally {
      setLoading(false);
    }
  }

  function handleCopyCredentials() {
    if (!createdAccount) return;

    const credentials = `Email: ${createdAccount.email}\nMot de passe temporaire: ${createdAccount.temporaryPassword}\nExpire le: ${new Date(createdAccount.expiresAt).toLocaleDateString('fr-FR')}`;

    navigator.clipboard.writeText(credentials);
  }

  function handleCopyPassword() {
    if (!createdAccount) return;
    navigator.clipboard.writeText(createdAccount.temporaryPassword);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={createdAccount ? 'Compte médecin créé avec succès' : 'Créer un compte médecin'}
    >
      {!createdAccount ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">
                  Création de compte sécurisée
                </h4>
                <p className="text-sm text-blue-700">
                  Un mot de passe temporaire sera généré automatiquement. Le médecin devra le changer lors de sa première connexion.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Input
            label="Email professionnel"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="docteur@exemple.com"
            required
            icon={Mail}
          />

          <Input
            label="Nom complet"
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="Dr. Jean Dupont"
            required
            icon={User}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Spécialité <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              required
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            >
              <option value="">Sélectionner une spécialité</option>
              {SPECIALITIES.map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>

          <Input
            label="Numéro RPPS"
            type="text"
            value={formData.rpps_number}
            onChange={(e) => setFormData({ ...formData, rpps_number: e.target.value })}
            placeholder="12345678901"
            required
            icon={FileText}
          />

          <Input
            label="Numéro d'ordre / Licence médicale"
            type="text"
            value={formData.medical_license_number}
            onChange={(e) => setFormData({ ...formData, medical_license_number: e.target.value })}
            placeholder="ML-123456"
            required
            icon={Briefcase}
          />

          <Input
            label="Téléphone"
            type="tel"
            value={formData.phone_number}
            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
            placeholder="+33 6 12 34 56 78"
            required
            icon={Phone}
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              Créer le compte
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-green-900 mb-1">
                  Compte créé avec succès
                </h4>
                <p className="text-sm text-green-700">
                  Le compte médecin a été créé. Partagez ces informations de connexion de manière sécurisée.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900 mb-1">
                  Important - Sécurité
                </h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Le mot de passe temporaire expire le {new Date(createdAccount.expiresAt).toLocaleDateString('fr-FR')}</li>
                  <li>• Le médecin DOIT changer son mot de passe lors de sa première connexion</li>
                  <li>• Partagez ces informations de manière sécurisée (email chiffré, message privé)</li>
                  <li>• Ne conservez PAS ces informations après les avoir transmises</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email de connexion
              </label>
              <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <code className="flex-1 text-sm text-gray-900 font-mono">
                  {createdAccount.email}
                </code>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe temporaire
              </label>
              <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                <code className="flex-1 text-sm text-gray-900 font-mono break-all">
                  {createdAccount.temporaryPassword}
                </code>
                <button
                  onClick={handleCopyPassword}
                  className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1.5 flex-shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copier
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date d'expiration
              </label>
              <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                <code className="flex-1 text-sm text-gray-900 font-mono">
                  {new Date(createdAccount.expiresAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </code>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleCopyCredentials}
              variant="secondary"
              className="flex-1"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copier tout
            </Button>
            <Button
              onClick={handleClose}
              className="flex-1"
            >
              Terminé
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
