import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Stethoscope, CreditCard, Save, X, LogOut as LogOutIcon, Building2, Phone, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Toast } from '../components/Toast';
import { SPECIALITES } from '../lib/specialites';

type ViewMode = 'VIEW' | 'EDIT';

interface FormData {
  prenom: string;
  nom: string;
  specialite: string;
  rpps: string;
  ordre_number: string;
  org_name: string;
  org_adresse: string;
  org_telephone: string;
  org_email: string;
}

const EMPTY_FORM: FormData = {
  prenom: '',
  nom: '',
  specialite: '',
  rpps: '',
  ordre_number: '',
  org_name: '',
  org_adresse: '',
  org_telephone: '',
  org_email: '',
};

export default function DoctorProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<ViewMode>('VIEW');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [savedFormData, setSavedFormData] = useState<FormData>(EMPTY_FORM);
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
        .select('id, rpps, specialite, ordre_number, org_id')
        .eq('user_id', user.id)
        .maybeSingle();

      let orgData: { name: string; adresse: string | null; telephone: string | null; email: string | null } | null = null;
      if (doctorData?.org_id) {
        const { data } = await supabase
          .from('organizations')
          .select('name, adresse, telephone, email')
          .eq('id', doctorData.org_id)
          .maybeSingle();
        orgData = data;
      }

      const data: FormData = {
        prenom: profileData?.prenom || user.prenom || '',
        nom: profileData?.nom || user.nom || '',
        specialite: doctorData?.specialite || '',
        rpps: doctorData?.rpps || '',
        ordre_number: doctorData?.ordre_number || '',
        org_name: orgData?.name || '',
        org_adresse: orgData?.adresse || '',
        org_telephone: orgData?.telephone || '',
        org_email: orgData?.email || '',
      };

      setFormData(data);
      setSavedFormData(data);
      if (doctorData?.id) setDoctorId(doctorData.id);
      if (doctorData?.org_id) setOrgId(doctorData.org_id);
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

      if (orgId) {
        const { data: updatedOrg, error: orgError } = await supabase
          .from('organizations')
          .update({
            name: formData.org_name || savedFormData.org_name,
            adresse: formData.org_adresse || null,
            telephone: formData.org_telephone || null,
            email: formData.org_email || null,
          })
          .eq('id', orgId)
          .select('id');

        if (orgError) throw orgError;

        // RLS refuse silencieusement : 0 ligne modifiée sans erreur
        if (!updatedOrg || updatedOrg.length === 0) {
          setToast({
            message: "Vous n'êtes pas autorisé à modifier les informations de cette structure — contactez l'administrateur de la clinique.",
            type: 'error',
          });
          setSaving(false);
          return;
        }
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

  const field = (label: string, value: string) => (
    <p className="text-[#0A1628] font-medium">{value || <span className="text-[#94A3B8] font-normal">Non renseigné</span>}</p>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00A86B]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] py-8 px-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Button variant="secondary" onClick={() => navigate('/doctor')} className="mb-4">
              ← Retour au tableau de bord
            </Button>
            <h1 className="text-3xl font-bold text-[#0A1628]">Mon Profil</h1>
          </div>
          <Button
            variant="ghost"
            onClick={async () => { await signOut(); navigate('/'); }}
          >
            <LogOutIcon className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6 border border-[#E5E5E0]">
          {/* Hero */}
          <div className="bg-[#0A1628] px-8 py-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-[#E6F4EE] flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-[#00A86B]">
                  {(formData.prenom.charAt(0) + formData.nom.charAt(0)).toUpperCase()}
                </span>
              </div>
              <div className="text-white min-w-0">
                <h2 className="text-2xl font-bold">Dr. {formData.prenom} {formData.nom}</h2>
                <p className="text-white/80 mt-1">{user?.email}</p>
                {formData.specialite && <p className="text-white/80 mt-1">{formData.specialite}</p>}
              </div>
            </div>
          </div>

          <div className="px-8 py-6">
            {mode === 'VIEW' ? (
              <div className="space-y-8">
                {/* Identité */}
                <div>
                  <h3 className="text-xs font-semibold text-[#475569] uppercase tracking-widest mb-4">Identité</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-start space-x-3">
                      <User className="w-5 h-5 text-[#94A3B8] mt-0.5 flex-shrink-0" />
                      <div><p className="text-sm text-[#94A3B8]">Prénom</p>{field('Prénom', formData.prenom)}</div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <User className="w-5 h-5 text-[#94A3B8] mt-0.5 flex-shrink-0" />
                      <div><p className="text-sm text-[#94A3B8]">Nom</p>{field('Nom', formData.nom)}</div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Mail className="w-5 h-5 text-[#94A3B8] mt-0.5 flex-shrink-0" />
                      <div><p className="text-sm text-[#94A3B8]">Email</p><p className="text-[#0A1628] font-medium">{user?.email}</p></div>
                    </div>
                  </div>
                </div>

                {/* Profil prescripteur */}
                <div className="border-t border-[#E5E5E0] pt-6">
                  <h3 className="text-xs font-semibold text-[#475569] uppercase tracking-widest mb-1">Profil prescripteur</h3>
                  <p className="text-xs text-[#94A3B8] mb-4">Ces informations apparaissent sur vos ordonnances.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-start space-x-3">
                      <Stethoscope className="w-5 h-5 text-[#94A3B8] mt-0.5 flex-shrink-0" />
                      <div><p className="text-sm text-[#94A3B8]">Spécialité</p>{field('Spécialité', formData.specialite)}</div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CreditCard className="w-5 h-5 text-[#94A3B8] mt-0.5 flex-shrink-0" />
                      <div><p className="text-sm text-[#94A3B8]">N° Ordre National</p>{field('N° Ordre', formData.ordre_number)}</div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CreditCard className="w-5 h-5 text-[#94A3B8] mt-0.5 flex-shrink-0" />
                      <div><p className="text-sm text-[#94A3B8]">Numéro INPE</p>{field('INPE', formData.rpps)}</div>
                    </div>
                  </div>
                </div>

                {/* Cabinet */}
                <div className="border-t border-[#E5E5E0] pt-6">
                  <h3 className="text-xs font-semibold text-[#475569] uppercase tracking-widest mb-1">Cabinet</h3>
                  <p className="text-xs text-[#94A3B8] mb-4">Ces informations apparaissent sur vos ordonnances.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-start space-x-3">
                      <Building2 className="w-5 h-5 text-[#94A3B8] mt-0.5 flex-shrink-0" />
                      <div><p className="text-sm text-[#94A3B8]">Nom du cabinet</p>{field('Nom', formData.org_name)}</div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <MapPin className="w-5 h-5 text-[#94A3B8] mt-0.5 flex-shrink-0" />
                      <div><p className="text-sm text-[#94A3B8]">Adresse</p>{field('Adresse', formData.org_adresse)}</div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Phone className="w-5 h-5 text-[#94A3B8] mt-0.5 flex-shrink-0" />
                      <div><p className="text-sm text-[#94A3B8]">Téléphone</p>{field('Téléphone', formData.org_telephone)}</div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Mail className="w-5 h-5 text-[#94A3B8] mt-0.5 flex-shrink-0" />
                      <div><p className="text-sm text-[#94A3B8]">Email du cabinet</p>{field('Email', formData.org_email)}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E5E5E0]">
                  <Button onClick={() => setMode('EDIT')} variant="primary">
                    Modifier le profil
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Identité */}
                <div>
                  <h3 className="text-xs font-semibold text-[#475569] uppercase tracking-widest mb-4">Identité</h3>
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
                </div>

                {/* Profil prescripteur */}
                <div className="border-t border-[#E5E5E0] pt-6">
                  <h3 className="text-xs font-semibold text-[#475569] uppercase tracking-widest mb-1">Profil prescripteur</h3>
                  <p className="text-xs text-[#94A3B8] mb-4">Ces informations apparaissent sur vos ordonnances.</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#475569] mb-1">Spécialité</label>
                      <select
                        value={formData.specialite}
                        onChange={(e) => setFormData({ ...formData, specialite: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-[#E5E5E0] rounded-lg focus:ring-2 focus:ring-[#00A86B] focus:border-transparent outline-none text-sm"
                      >
                        <option value="">Sélectionner une spécialité</option>
                        {SPECIALITES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <Input
                      label="Numéro d'Ordre National des Médecins"
                      value={formData.ordre_number}
                      onChange={(e) => setFormData({ ...formData, ordre_number: e.target.value })}
                      placeholder="Ex. : 12345"
                    />
                    <div>
                      <Input
                        label="Numéro INPE"
                        value={formData.rpps}
                        onChange={(e) => setFormData({ ...formData, rpps: e.target.value })}
                        placeholder="11 chiffres"
                      />
                      <p className="text-xs text-[#94A3B8] mt-1">Utile pour les feuilles de soins AMO.</p>
                    </div>
                  </div>
                </div>

                {/* Cabinet */}
                <div className="border-t border-[#E5E5E0] pt-6">
                  <h3 className="text-xs font-semibold text-[#475569] uppercase tracking-widest mb-1">Cabinet</h3>
                  <p className="text-xs text-[#94A3B8] mb-4">Ces informations apparaissent sur vos ordonnances.</p>
                  <div className="space-y-4">
                    <Input
                      label="Nom du cabinet"
                      value={formData.org_name}
                      onChange={(e) => setFormData({ ...formData, org_name: e.target.value })}
                    />
                    <Input
                      label="Adresse"
                      value={formData.org_adresse}
                      onChange={(e) => setFormData({ ...formData, org_adresse: e.target.value })}
                      placeholder="Rue, quartier, ville"
                    />
                    <Input
                      label="Téléphone"
                      value={formData.org_telephone}
                      onChange={(e) => setFormData({ ...formData, org_telephone: e.target.value })}
                    />
                    <Input
                      label="Email du cabinet"
                      value={formData.org_email}
                      onChange={(e) => setFormData({ ...formData, org_email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-[#E5E5E0]">
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
          </div>
        </div>
      </div>
    </div>
  );
}
