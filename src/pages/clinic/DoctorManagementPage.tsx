import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { Toast } from '../../components/Toast';
import { CreateDoctorAccountModal } from '../../components/CreateDoctorAccountModal';
import { Users, Mail, UserPlus, AlertCircle, MoreVertical, CheckCircle, XCircle, RefreshCw, Eye, Lock, UserX, Copy, ExternalLink, UserCog } from 'lucide-react';

interface Doctor {
  id: string;
  email: string;
  full_name: string | null;
  specialization: string[] | null;
  rpps_number: string | null;
  is_active: boolean;
}

interface Invitation {
  id: string;
  email: string;
  status: string;
  speciality: string | null;
  created_at: string;
  expires_at: string;
  token: string;
  role: string;
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

const ROLES = [
  { value: 'doctor', label: 'Médecin' },
  { value: 'chef_service', label: 'Chef de service' }
];

export function DoctorManagementPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);

  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    speciality: '',
    role: 'doctor',
    message: ''
  });

  useEffect(() => {
    loadDoctorsAndInvitations();
  }, []);

  useEffect(() => {
    if (!clinicId) return;

    const channel = supabase
      .channel('clinic-invitations')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'clinic_invitations',
          filter: `clinic_id=eq.${clinicId}`
        },
        (payload: any) => {
          if (payload.new.status === 'accepted') {
            setSuccess(`Dr. ${payload.new.email} a rejoint votre clinique !`);
            loadDoctorsAndInvitations();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [clinicId]);

  async function loadDoctorsAndInvitations() {
    try {
      setLoading(true);

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('clinic_id')
        .eq('id', user?.id)
        .maybeSingle();

      if (!profile?.clinic_id) {
        setLoading(false);
        return;
      }

      setClinicId(profile.clinic_id);

      const [doctorsRes, invitationsRes] = await Promise.all([
        supabase
          .from('doctor_profiles')
          .select('id, email, full_name, specialization, rpps_number, is_active')
          .eq('clinic_id', profile.clinic_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('clinic_invitations')
          .select('id, email, status, speciality, created_at, expires_at, token, role')
          .eq('clinic_id', profile.clinic_id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
      ]);

      setDoctors(doctorsRes.data || []);
      setInvitations(invitationsRes.data || []);
    } catch (error) {
      console.error('Error loading doctors:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendInvitation(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setInviteLoading(true);

    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('clinic_id')
        .eq('id', user?.id)
        .maybeSingle();

      if (!profile?.clinic_id) {
        throw new Error('Clinic not found');
      }

      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('email', inviteForm.email)
        .maybeSingle();

      if (existingUser) {
        setError('Ce médecin a déjà un compte OrdoSur. Contactez le support pour le rattacher à votre clinique.');
        setInviteLoading(false);
        return;
      }

      const { data: existingInvite } = await supabase
        .from('clinic_invitations')
        .select('id, status')
        .eq('clinic_id', profile.clinic_id)
        .eq('email', inviteForm.email)
        .maybeSingle();

      if (existingInvite?.status === 'pending') {
        setError('Une invitation est déjà en attente pour cet email.');
        setInviteLoading(false);
        return;
      }

      const { data: invitation, error: inviteError } = await supabase
        .from('clinic_invitations')
        .insert({
          clinic_id: profile.clinic_id,
          email: inviteForm.email,
          role: inviteForm.role,
          speciality: inviteForm.speciality,
          invited_by: user?.id,
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      const { data: invitationData } = await supabase
        .from('clinic_invitations')
        .select('token')
        .eq('email', inviteForm.email)
        .eq('invited_by', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (invitationData?.token) {
        const invitationUrl = `${window.location.origin}/accept-invitation?token=${invitationData.token}`;

        const { error: magicLinkError } = await supabase.auth.signInWithOtp({
          email: inviteForm.email,
          options: {
            emailRedirectTo: invitationUrl,
            shouldCreateUser: false
          }
        });

        if (magicLinkError) {
          setSuccess(`Invitation créée. Partagez ce lien avec ${inviteForm.email}: ${invitationUrl}`);
        } else {
          setSuccess(`Invitation envoyée à ${inviteForm.email}. Lien de secours : ${invitationUrl}`);
        }
      } else {
        setSuccess(`Invitation créée avec succès pour ${inviteForm.email}`);
      }

      setInviteForm({
        email: '',
        firstName: '',
        lastName: '',
        speciality: '',
        role: 'doctor',
        message: ''
      });
      setShowInviteModal(false);
      loadDoctorsAndInvitations();
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      setError(error.message || 'Erreur lors de l\'envoi de l\'invitation');
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleResendInvitation(invitationId: string) {
    try {
      const { error } = await supabase
        .from('clinic_invitations')
        .update({ created_at: new Date().toISOString() })
        .eq('id', invitationId);

      if (error) throw error;
      setSuccess('Invitation renvoyée avec succès');
    } catch (error) {
      setError('Erreur lors du renvoi de l\'invitation');
    }
  }

  async function handleRevokeInvitation(invitationId: string) {
    try {
      const { error } = await supabase
        .from('clinic_invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId);

      if (error) throw error;
      setSuccess('Invitation révoquée');
      loadDoctorsAndInvitations();
    } catch (error) {
      setError('Erreur lors de la révocation');
    }
  }

  function handleCopyInvitationLink(token: string) {
    const invitationUrl = `${window.location.origin}/accept-invitation?token=${token}`;
    navigator.clipboard.writeText(invitationUrl);
    setSuccess('Lien d\'invitation copié dans le presse-papier');
  }

  async function handleToggleDoctor(doctorId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('doctor_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', doctorId);

      if (error) throw error;

      setDoctors(doctors.map(d =>
        d.id === doctorId ? { ...d, is_active: !currentStatus } : d
      ));
      setSuccess(currentStatus ? 'Médecin désactivé' : 'Médecin activé');
    } catch (error) {
      setError('Erreur lors de la modification du statut');
    }
    setActiveMenu(null);
  }

  async function handleResetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;
      setSuccess('Email de réinitialisation envoyé');
    } catch (error) {
      setError('Erreur lors de l\'envoi de l\'email');
    }
    setActiveMenu(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <div className="flex">
        <aside className="w-64 min-h-screen bg-white border-r border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <button
              onClick={() => navigate('/clinic/admin')}
              className="flex items-center gap-3 w-full"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h2 className="font-bold text-gray-900">Ma Clinique</h2>
                <p className="text-xs text-gray-500">Administration</p>
              </div>
            </button>
          </div>

          <nav className="p-4">
            <div className="space-y-1">
              <button
                onClick={() => navigate('/clinic/admin')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span>Tableau de bord</span>
              </button>

              <button
                onClick={() => navigate('/clinic/admin/doctors')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left bg-blue-50 text-blue-700 font-medium"
              >
                <Users className="w-5 h-5" />
                <span>Médecins</span>
              </button>

              <button
                onClick={() => navigate('/clinic/admin/stats')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Statistiques</span>
              </button>

              <button
                onClick={() => navigate('/clinic/admin/settings')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Paramètres</span>
              </button>
            </div>
          </nav>
        </aside>

        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des médecins</h1>
                <p className="text-gray-600">Gérez les médecins de votre clinique</p>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setShowCreateAccountModal(true)} variant="primary">
                  <UserCog className="w-5 h-5 mr-2" />
                  Créer un compte
                </Button>
                <Button onClick={() => setShowInviteModal(true)} variant="secondary">
                  <UserPlus className="w-5 h-5 mr-2" />
                  Inviter un médecin
                </Button>
              </div>
            </div>

            {error && (
              <Toast
                message={error}
                type="error"
                onClose={() => setError('')}
              />
            )}

            {success && (
              <Toast
                message={success}
                type="success"
                onClose={() => setSuccess('')}
              />
            )}

            {invitations.length > 0 && (
              <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-amber-600" />
                  Invitations en attente
                </h3>
                <div className="space-y-3">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="bg-white p-4 rounded-lg shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                              <Mail className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{invitation.email}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <p className="text-sm text-gray-500">
                                  {invitation.speciality || 'Spécialité non renseignée'}
                                </p>
                                <span className="text-gray-300">•</span>
                                <p className="text-sm text-gray-500">
                                  Envoyée le {new Date(invitation.created_at).toLocaleDateString('fr-FR')}
                                </p>
                                <span className="text-gray-300">•</span>
                                <p className="text-sm text-gray-500">
                                  Expire le {new Date(invitation.expires_at).toLocaleDateString('fr-FR')}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleResendInvitation(invitation.id)}
                            className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Renvoyer
                          </button>
                          <button
                            onClick={() => handleRevokeInvitation(invitation.id)}
                            className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            Révoquer
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                        <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <code className="flex-1 text-xs text-gray-600 font-mono truncate">
                          {`${window.location.origin}/accept-invitation?token=${invitation.token}`}
                        </code>
                        <button
                          onClick={() => handleCopyInvitationLink(invitation.token)}
                          className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1.5 flex-shrink-0"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copier
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Médecin
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Spécialité
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        N° RPPS
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          </div>
                        </td>
                      </tr>
                    ) : doctors.length === 0 && invitations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Users className="w-12 h-12 text-gray-300" />
                            <p className="text-gray-500">Aucun médecin enregistré</p>
                            <Button onClick={() => setShowInviteModal(true)} variant="secondary">
                              <UserPlus className="w-4 h-4 mr-2" />
                              Inviter votre premier médecin
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      doctors.map((doctor) => (
                        <tr key={doctor.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900">
                                {doctor.full_name || 'Non renseigné'}
                              </p>
                              <p className="text-sm text-gray-500">{doctor.email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-900">
                            {doctor.specialization?.[0] || '-'}
                          </td>
                          <td className="px-6 py-4 text-gray-900">
                            {doctor.rpps_number || '-'}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium inline-flex items-center gap-1.5 ${
                                doctor.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {doctor.is_active ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Actif
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3.5 h-3.5" />
                                  Inactif
                                </>
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="relative">
                              <button
                                onClick={() => setActiveMenu(activeMenu === doctor.id ? null : doctor.id)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                <MoreVertical className="w-5 h-5 text-gray-600" />
                              </button>

                              {activeMenu === doctor.id && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                                  <button
                                    onClick={() => navigate(`/doctor/${doctor.id}`)}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                                  >
                                    <Eye className="w-4 h-4" />
                                    Voir le profil complet
                                  </button>
                                  <button
                                    onClick={() => handleToggleDoctor(doctor.id, doctor.is_active)}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                                  >
                                    {doctor.is_active ? (
                                      <>
                                        <XCircle className="w-4 h-4" />
                                        Désactiver le compte
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="w-4 h-4" />
                                        Réactiver le compte
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleResetPassword(doctor.email)}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                                  >
                                    <Lock className="w-4 h-4" />
                                    Réinitialiser le mot de passe
                                  </button>
                                  <div className="border-t border-gray-200 my-1"></div>
                                  <button
                                    onClick={() => {
                                      if (confirm('Êtes-vous sûr de vouloir retirer ce médecin de la clinique ?')) {
                                        setActiveMenu(null);
                                      }
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                                  >
                                    <UserX className="w-4 h-4" />
                                    Retirer de la clinique
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Inviter un médecin"
      >
        <form onSubmit={handleSendInvitation} className="space-y-4">
          <Input
            label="Adresse e-mail"
            type="email"
            value={inviteForm.email}
            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
            placeholder="docteur@exemple.com"
            required
            icon={Mail}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Prénom"
              type="text"
              value={inviteForm.firstName}
              onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
              placeholder="Jean"
              required
            />
            <Input
              label="Nom"
              type="text"
              value={inviteForm.lastName}
              onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
              placeholder="Dupont"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Spécialité <span className="text-red-500">*</span>
            </label>
            <select
              value={inviteForm.speciality}
              onChange={(e) => setInviteForm({ ...inviteForm, speciality: e.target.value })}
              required
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            >
              <option value="">Sélectionner une spécialité</option>
              {SPECIALITIES.map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rôle
            </label>
            <select
              value={inviteForm.role}
              onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            >
              {ROLES.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message personnalisé (optionnel)
            </label>
            <textarea
              value={inviteForm.message}
              onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value.slice(0, 300) })}
              placeholder={`Bonjour Dr. ${inviteForm.lastName || '[Nom]'}, je vous invite à rejoindre notre équipe sur OrdoSur...`}
              maxLength={300}
              rows={4}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
            />
            <p className="mt-1 text-xs text-gray-500 text-right">
              {inviteForm.message.length}/300 caractères
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowInviteModal(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button type="submit" loading={inviteLoading} className="flex-1">
              Envoyer l'invitation
            </Button>
          </div>
        </form>
      </Modal>

      {clinicId && (
        <CreateDoctorAccountModal
          isOpen={showCreateAccountModal}
          onClose={() => setShowCreateAccountModal(false)}
          clinicId={clinicId}
          onSuccess={() => {
            setSuccess('Compte médecin créé avec succès');
            loadDoctorsAndInvitations();
          }}
        />
      )}
    </div>
  );
}
