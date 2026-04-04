import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Stethoscope, CreditCard, Save, X, Lock, LogOut as LogOutIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Toast } from '../components/Toast';

type ViewMode = 'VIEW' | 'EDIT';

interface FormData {
  prenom: string;
  nom: string;
  specialite: string;
  rpps: string;
  ordre_number: string;
}

interface PasswordFormData {
  newPassword: string;
  confirmPassword: string;
}

const SPECIALIZATIONS = [
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

export default function DoctorProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<ViewMode>('VIEW');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    prenom: '',
    nom: '',
    specialite: '',
    rpps: '',
    ordre_number: '',
  });
  const [savedFormData, setSavedFormData] = useState<FormData>({
    prenom: '',
    nom: '',
    specialite: '',
    rpps: '',
    ordre_number: '',
  });
  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    newPassword: '',
    confirmPassword: '',
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    loadProfileData();
  }, [user, navigate]);

  const loadProfileData = async () => {
    if (!user) return;
    try {
      setLoading(true);

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('prenom, nom')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: doctorData } = await supabase
        .from('doctors')
        .select('id, rpps, specialite, ordre_number')
        .eq('user_id', user.id)
        .maybeSingle();

      const data: FormData = {
        prenom: profileData?.prenom || user.prenom || '',
        nom: profileData?.nom || user.nom || '',
        specialite: doctorData?.specialite || '',
        rpps: doctorData?.rpps || '',
        ordre_number: doctorData?.ordre_number || '',
      };

      setFormData(data);
      setSavedFormData(data);
      if (doctorData?.id) setDoctorId(doctorData.id);
    } catch (error) {
      console.error('Error loading profile:', error);
      setToast({ message: 'Erreur lors du chargement du profil', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      setSaving(true);

      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ prenom: formData.prenom, nom: formData.nom })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      if (doctorId) {
        const { error: doctorError } = await supabase
          .from('doctors')
          .update({
            specialite: formData.specialite || null,
            rpps: formData.rpps || null,
            ordre_number: formData.ordre_number || null,
          })
          .eq('id', doctorId);

        if (doctorError) throw doctorError;
      }

      setSavedFormData(formData);
      setMode('VIEW');
      setToast({ message: 'Profil mis à jour avec succès', type: 'success' });
    } catch (error) {
      console.error('Error saving profile:', error);
      setToast({ message: 'Erreur lors de la sauvegarde', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(savedFormData);
    setMode('VIEW');
  };

  const handlePasswordChange = async () => {
    if (!passwordData.newPassword || passwordData.newPassword.length < 8) {
      setToast({ message: 'Le mot de passe doit contenir au moins 8 caractères', type: 'error' });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setToast({ message: 'Les mots de passe ne correspondent pas', type: 'error' });
      return;
    }
    try {
      setChangingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
      if (error) throw error;
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
      setToast({ message: 'Mot de passe modifié avec succès', type: 'success' });
    } catch (error) {
      setToast({ message: 'Erreur lors du changement de mot de passe', type: 'error' });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Button variant="secondary" onClick={() => navigate('/doctor')} className="mb-4">
              ← Retour au tableau de bord
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Mon Profil</h1>
          </div>
          <Button
            variant="ghost"
            onClick={async () => { await signOut(); navigate('/'); }}
          >
            <LogOutIcon className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>

        {/* Profile card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-600">
                  {(formData.prenom.charAt(0) + formData.nom.charAt(0)).toUpperCase()}
                </span>
              </div>
              <div className="text-white">
                <h2 className="text-2xl font-bold">Dr. {formData.prenom} {formData.nom}</h2>
                <p className="text-blue-100 mt-1">{user?.email}</p>
                {formData.specialite && (
                  <p className="text-blue-100 mt-1">{formData.specialite}</p>
                )}
              </div>
            </div>
          </div>

          <div className="px-8 py-6">
            {mode === 'VIEW' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start space-x-3">
                    <User className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500">Prénom</p>
                      <p className="text-gray-900 font-medium">{formData.prenom || 'Non renseigné'}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <User className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500">Nom</p>
                      <p className="text-gray-900 font-medium">{formData.nom || 'Non renseigné'}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Mail className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="text-gray-900 font-medium">{user?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Stethoscope className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500">Spécialité</p>
                      <p className="text-gray-900 font-medium">{formData.specialite || 'Non renseigné'}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <CreditCard className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500">Numéro RPPS</p>
                      <p className="text-gray-900 font-medium">{formData.rpps || 'Non renseigné'}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <CreditCard className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500">N° Ordre</p>
                      <p className="text-gray-900 font-medium">{formData.ordre_number || 'Non renseigné'}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t flex gap-3">
                  <Button onClick={() => setMode('EDIT')} variant="primary">
                    Modifier le profil
                  </Button>
                  <Button onClick={() => setShowPasswordForm(!showPasswordForm)} variant="secondary">
                    <Lock className="w-4 h-4 mr-2" />
                    Changer le mot de passe
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Prénom"
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    required
                  />
                  <Input
                    label="Nom"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Spécialité</label>
                  <select
                    value={formData.specialite}
                    onChange={(e) => setFormData({ ...formData, specialite: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  >
                    <option value="">Sélectionner une spécialité</option>
                    {SPECIALIZATIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Numéro RPPS"
                  value={formData.rpps}
                  onChange={(e) => setFormData({ ...formData, rpps: e.target.value })}
                  placeholder="11 chiffres"
                />

                <Input
                  label="Numéro d'Ordre"
                  value={formData.ordre_number}
                  onChange={(e) => setFormData({ ...formData, ordre_number: e.target.value })}
                />

                <div className="flex gap-3 pt-4">
                  <Button onClick={handleCancel} variant="secondary">
                    <X className="w-4 h-4 mr-2" />
                    Annuler
                  </Button>
                  <Button onClick={handleSave} loading={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    Enregistrer
                  </Button>
                </div>
              </div>
            )}

            {showPasswordForm && mode === 'VIEW' && (
              <div className="mt-6 pt-6 border-t space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Changer le mot de passe</h3>
                <Input
                  label="Nouveau mot de passe"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Minimum 8 caractères"
                />
                <Input
                  label="Confirmer le mot de passe"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                />
                <div className="flex gap-3">
                  <Button onClick={() => setShowPasswordForm(false)} variant="secondary">
                    Annuler
                  </Button>
                  <Button onClick={handlePasswordChange} loading={changingPassword}>
                    Changer le mot de passe
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
