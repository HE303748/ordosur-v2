import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Stethoscope, CreditCard, Phone, FileText, Calendar, CreditCard as Edit2, Save, X, Camera, Lock, Shield, Clock, LogOut as LogOutIcon, Globe, Briefcase, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Toast } from '../components/Toast';

type ViewMode = 'VIEW' | 'EDIT';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  email_confirmed: boolean;
  last_login: string | null;
}

interface DoctorProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  specialization: string[] | null;
  rpps_number: string | null;
  phone_number: string | null;
  medical_license_number: string | null;
  adeli_number: string | null;
  practice_mode: string | null;
  languages: string[] | null;
  biography: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface FormData {
  fullName: string;
  specialization: string;
  rppsNumber: string;
  phoneNumber: string;
  medicalLicenseNumber: string;
  adeliNumber: string;
  practiceMode: string;
  languages: string[];
  biography: string;
}

interface PasswordFormData {
  currentPassword: string;
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

const PRACTICE_MODES = [
  'Libéral',
  'Salarié',
  'Hospitalier',
  'Mixte'
];

const LANGUAGES = [
  'Français',
  'Arabe',
  'Anglais',
  'Espagnol',
  'Allemand',
  'Autre'
];

export default function DoctorProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ViewMode>('VIEW');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [sessionCreatedAt, setSessionCreatedAt] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    specialization: '',
    rppsNumber: '',
    phoneNumber: '',
    medicalLicenseNumber: '',
    adeliNumber: '',
    practiceMode: '',
    languages: [],
    biography: ''
  });
  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadProfileData();
    loadSession();
  }, [user, navigate]);

  const loadSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setSessionCreatedAt(session.created_at);
    }
  };

  const loadProfileData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: userProfileData, error: userError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (userError) throw userError;

      const { data: doctorProfileData, error: doctorError } = await supabase
        .from('doctor_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (doctorError) throw doctorError;

      setUserProfile(userProfileData);
      setDoctorProfile(doctorProfileData);

      if (userProfileData && doctorProfileData) {
        setFormData({
          fullName: userProfileData.full_name || '',
          specialization: doctorProfileData.specialization?.[0] || '',
          rppsNumber: doctorProfileData.rpps_number || '',
          phoneNumber: doctorProfileData.phone_number || '',
          medicalLicenseNumber: doctorProfileData.medical_license_number || '',
          adeliNumber: doctorProfileData.adeli_number || '',
          practiceMode: doctorProfileData.practice_mode || '',
          languages: doctorProfileData.languages || [],
          biography: doctorProfileData.biography || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setToast({ message: 'Erreur lors du chargement du profil', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;

    try {
      setUploadingAvatar(true);

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('doctor_profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await loadProfileData();
      setToast({ message: 'Photo de profil mise à jour avec succès', type: 'success' });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setToast({ message: 'Erreur lors du téléchargement de la photo', type: 'error' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setToast({ message: 'La taille du fichier ne doit pas dépasser 2 Mo', type: 'error' });
        return;
      }
      if (!file.type.startsWith('image/')) {
        setToast({ message: 'Veuillez sélectionner une image', type: 'error' });
        return;
      }
      uploadAvatar(file);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);

      const { error: userError } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.fullName,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (userError) throw userError;

      const { error: doctorError } = await supabase
        .from('doctor_profiles')
        .update({
          full_name: formData.fullName,
          specialization: formData.specialization ? [formData.specialization] : null,
          rpps_number: formData.rppsNumber || null,
          phone_number: formData.phoneNumber || null,
          medical_license_number: formData.medicalLicenseNumber || null,
          adeli_number: formData.adeliNumber || null,
          practice_mode: formData.practiceMode || null,
          languages: formData.languages.length > 0 ? formData.languages : null,
          biography: formData.biography || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (doctorError) throw doctorError;

      await loadProfileData();
      setMode('VIEW');
      setToast({ message: 'Profil mis à jour avec succès', type: 'success' });
    } catch (error) {
      console.error('Error saving profile:', error);
      setToast({ message: 'Erreur lors de la sauvegarde du profil', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (userProfile && doctorProfile) {
      setFormData({
        fullName: userProfile.full_name || '',
        specialization: doctorProfile.specialization?.[0] || '',
        rppsNumber: doctorProfile.rpps_number || '',
        phoneNumber: doctorProfile.phone_number || '',
        medicalLicenseNumber: doctorProfile.medical_license_number || '',
        adeliNumber: doctorProfile.adeli_number || '',
        practiceMode: doctorProfile.practice_mode || '',
        languages: doctorProfile.languages || [],
        biography: doctorProfile.biography || ''
      });
    }
    setMode('VIEW');
  };

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères';
    if (!/[A-Z]/.test(password)) return 'Le mot de passe doit contenir au moins une majuscule';
    if (!/[a-z]/.test(password)) return 'Le mot de passe doit contenir au moins une minuscule';
    if (!/[0-9]/.test(password)) return 'Le mot de passe doit contenir au moins un chiffre';
    if (!/[^A-Za-z0-9]/.test(password)) return 'Le mot de passe doit contenir au moins un caractère spécial';
    return null;
  };

  const handlePasswordChange = async () => {
    if (!user) return;

    const validationError = validatePassword(passwordData.newPassword);
    if (validationError) {
      setToast({ message: validationError, type: 'error' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setToast({ message: 'Les mots de passe ne correspondent pas', type: 'error' });
      return;
    }

    try {
      setChangingPassword(true);

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
      setToast({ message: 'Mot de passe modifié avec succès', type: 'success' });
    } catch (error) {
      console.error('Error changing password:', error);
      setToast({ message: 'Erreur lors du changement de mot de passe', type: 'error' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSignOutAll = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      setToast({ message: 'Erreur lors de la déconnexion', type: 'error' });
    }
  };

  const toggleLanguage = (language: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language]
    }));
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Non disponible';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Profil non trouvé</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">
            Retour au tableau de bord
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="secondary"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            ← Retour au tableau de bord
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Mon Profil</h1>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-12">
            <div className="flex items-center space-x-6">
              <div className="relative group">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div
                  onClick={handleAvatarClick}
                  className="w-24 h-24 rounded-full bg-white flex items-center justify-center cursor-pointer relative overflow-hidden transition-all group-hover:ring-4 group-hover:ring-white/30"
                >
                  {doctorProfile?.avatar_url ? (
                    <img
                      src={doctorProfile.avatar_url}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-blue-600">
                      {getInitials(userProfile.full_name)}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploadingAvatar ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <Camera className="w-8 h-8 text-white" />
                    )}
                  </div>
                </div>
              </div>
              <div className="text-white">
                <h2 className="text-2xl font-bold">{userProfile.full_name}</h2>
                <p className="text-blue-100 mt-1">{userProfile.email}</p>
                {doctorProfile?.specialization?.[0] && (
                  <p className="text-blue-100 mt-1">{doctorProfile.specialization[0]}</p>
                )}
              </div>
            </div>
          </div>

          <div className="px-8 py-6">
            {mode === 'VIEW' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start space-x-3">
                    <User className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Nom complet</p>
                      <p className="text-gray-900 font-medium">{userProfile.full_name}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Mail className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="text-gray-900 font-medium">{userProfile.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Stethoscope className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Spécialisation</p>
                      <p className="text-gray-900 font-medium">
                        {doctorProfile?.specialization?.[0] || 'Non renseigné'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Briefcase className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Mode d'exercice</p>
                      <p className="text-gray-900 font-medium">
                        {doctorProfile?.practice_mode || 'Non renseigné'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <CreditCard className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Numéro RPPS</p>
                      <p className="text-gray-900 font-medium">
                        {doctorProfile?.rpps_number || 'Non renseigné'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <FileText className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Numéro ADELI</p>
                      <p className="text-gray-900 font-medium">
                        {doctorProfile?.adeli_number || 'Non renseigné'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Phone className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Téléphone</p>
                      <p className="text-gray-900 font-medium">
                        {doctorProfile?.phone_number || 'Non renseigné'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <FileText className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Numéro de licence médicale</p>
                      <p className="text-gray-900 font-medium">
                        {doctorProfile?.medical_license_number || 'Non renseigné'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Globe className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Langues parlées</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {doctorProfile?.languages && doctorProfile.languages.length > 0 ? (
                          doctorProfile.languages.map((lang) => (
                            <span
                              key={lang}
                              className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                            >
                              {lang}
                            </span>
                          ))
                        ) : (
                          <p className="text-gray-900 font-medium">Non renseigné</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Clock className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Dernière connexion</p>
                      <p className="text-gray-900 font-medium">
                        {formatDateTime(userProfile.last_login)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500">Date de création du compte</p>
                      <p className="text-gray-900 font-medium">
                        {new Date(userProfile.created_at).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {doctorProfile?.biography && (
                  <div className="flex items-start space-x-3 pt-4 border-t">
                    <MessageSquare className="w-5 h-5 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Biographie</p>
                      <p className="text-gray-900 mt-1 whitespace-pre-wrap">{doctorProfile.biography}</p>
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t">
                  <Button
                    onClick={() => setMode('EDIT')}
                    className="inline-flex items-center space-x-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Modifier mon profil</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <Input
                      label="Nom complet"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Spécialisation
                    </label>
                    <select
                      value={formData.specialization}
                      onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sélectionnez une spécialisation</option>
                      {SPECIALIZATIONS.map((spec) => (
                        <option key={spec} value={spec}>
                          {spec}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mode d'exercice
                    </label>
                    <select
                      value={formData.practiceMode}
                      onChange={(e) => setFormData({ ...formData, practiceMode: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sélectionnez un mode</option>
                      {PRACTICE_MODES.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Input
                      label="Numéro RPPS"
                      value={formData.rppsNumber}
                      onChange={(e) => setFormData({ ...formData, rppsNumber: e.target.value })}
                    />
                  </div>

                  <div>
                    <Input
                      label="Numéro ADELI"
                      value={formData.adeliNumber}
                      onChange={(e) => setFormData({ ...formData, adeliNumber: e.target.value })}
                    />
                  </div>

                  <div>
                    <Input
                      label="Téléphone"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    />
                  </div>

                  <div>
                    <Input
                      label="Numéro de licence médicale"
                      value={formData.medicalLicenseNumber}
                      onChange={(e) => setFormData({ ...formData, medicalLicenseNumber: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Langues parlées
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {LANGUAGES.map((lang) => (
                        <label key={lang} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.languages.includes(lang)}
                            onChange={() => toggleLanguage(lang)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{lang}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Biographie
                    </label>
                    <textarea
                      value={formData.biography}
                      onChange={(e) => {
                        if (e.target.value.length <= 500) {
                          setFormData({ ...formData, biography: e.target.value });
                        }
                      }}
                      rows={4}
                      maxLength={500}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Parlez-nous un peu de vous..."
                    />
                    <p className="text-sm text-gray-500 mt-1 text-right">
                      {formData.biography.length}/500 caractères
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 pt-6 border-t">
                  <Button
                    onClick={handleSave}
                    disabled={saving || !formData.fullName.trim()}
                    className="inline-flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleCancel}
                    disabled={saving}
                    className="inline-flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Annuler</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="px-8 py-6">
            <div className="flex items-center space-x-3 mb-6">
              <Shield className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Sécurité</h2>
            </div>

            {!showPasswordForm ? (
              <Button
                onClick={() => setShowPasswordForm(true)}
                variant="secondary"
                className="inline-flex items-center space-x-2"
              >
                <Lock className="w-4 h-4" />
                <span>Changer mon mot de passe</span>
              </Button>
            ) : (
              <div className="space-y-4 border-t pt-6">
                <Input
                  label="Nouveau mot de passe"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Minimum 8 caractères"
                />
                <Input
                  label="Confirmer le nouveau mot de passe"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                />
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Le mot de passe doit contenir :</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Au moins 8 caractères</li>
                    <li>Une majuscule et une minuscule</li>
                    <li>Un chiffre</li>
                    <li>Un caractère spécial</li>
                  </ul>
                </div>
                <div className="flex items-center space-x-4 pt-4">
                  <Button
                    onClick={handlePasswordChange}
                    disabled={changingPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                    className="inline-flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{changingPassword ? 'Mise à jour...' : 'Mettre à jour'}</span>
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                    disabled={changingPassword}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-8 py-6">
            <div className="flex items-center space-x-3 mb-6">
              <Clock className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Sessions & Connexions</h2>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Dernière connexion</p>
                <p className="text-gray-900 font-medium">{formatDateTime(userProfile.last_login)}</p>
              </div>

              {sessionCreatedAt && (
                <div>
                  <p className="text-sm text-gray-500">Session active depuis</p>
                  <p className="text-gray-900 font-medium">{formatDateTime(sessionCreatedAt)}</p>
                </div>
              )}

              <div className="pt-4 border-t">
                <Button
                  onClick={handleSignOutAll}
                  variant="danger"
                  className="inline-flex items-center space-x-2"
                >
                  <LogOutIcon className="w-4 h-4" />
                  <span>Se déconnecter de toutes les sessions</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
