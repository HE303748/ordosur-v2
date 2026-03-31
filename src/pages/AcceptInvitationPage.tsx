import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';
import { Mail, Lock, User, AlertCircle, CheckCircle, Heart, Phone, CreditCard } from 'lucide-react';

interface InvitationData {
  id: string;
  clinic_id: string;
  email: string;
  role: string;
  speciality: string | null;
  clinic_name: string;
  clinic_address: string;
  expires_at: string;
}

export function AcceptInvitationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    rppsNumber: '',
    phone: '',
    acceptTerms: false,
  });

  useEffect(() => {
    if (token) {
      validateInvitation();
    } else {
      setError('Lien d\'invitation manquant');
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (showSuccess && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (showSuccess && countdown === 0) {
      navigate('/doctor');
    }
  }, [showSuccess, countdown, navigate]);

  async function validateInvitation() {
    try {
      setLoading(true);
      setError('');

      const { data: invitationData, error: inviteError } = await supabase
        .from('clinic_invitations')
        .select(`
          id,
          clinic_id,
          email,
          role,
          speciality,
          expires_at,
          clinics (
            name,
            address_street,
            address_city
          )
        `)
        .eq('token', token)
        .eq('status', 'pending')
        .maybeSingle();

      if (inviteError) throw inviteError;

      if (!invitationData) {
        setError('Ce lien d\'invitation est invalide ou a expiré. Contactez votre administrateur.');
        setLoading(false);
        return;
      }

      if (new Date(invitationData.expires_at) < new Date()) {
        setError('Ce lien d\'invitation a expiré. Contactez votre administrateur pour recevoir un nouveau lien.');
        setLoading(false);
        return;
      }

      const clinic = invitationData.clinics as any;
      setInvitation({
        id: invitationData.id,
        clinic_id: invitationData.clinic_id,
        email: invitationData.email,
        role: invitationData.role,
        speciality: invitationData.speciality,
        clinic_name: clinic?.name || 'Clinique',
        clinic_address: clinic ? `${clinic.address_street}, ${clinic.address_city}` : '',
        expires_at: invitationData.expires_at,
      });
    } catch (error: any) {
      console.error('Error validating invitation:', error);
      setError('Erreur lors de la validation de l\'invitation');
    } finally {
      setLoading(false);
    }
  }

  async function handleAcceptInvitation(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    const hasUppercase = /[A-Z]/.test(formData.password);
    const hasLowercase = /[a-z]/.test(formData.password);
    const hasNumber = /[0-9]/.test(formData.password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(formData.password);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      setError('Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial');
      return;
    }

    if (!formData.acceptTerms) {
      setError('Vous devez accepter les conditions d\'utilisation');
      return;
    }

    if (!invitation) {
      setError('Données d\'invitation invalides');
      return;
    }

    setRegistering(true);

    try {
      const fullName = `${formData.firstName} ${formData.lastName}`;

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password: formData.password,
        options: {
          data: {
            full_name: fullName,
            role: 'doctor',
            clinic_id: invitation.clinic_id,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (!authData.user) {
        throw new Error('Échec de la création du compte');
      }

      await supabase
        .from('user_profiles')
        .update({
          clinic_id: invitation.clinic_id,
          full_name: fullName,
        })
        .eq('id', authData.user.id);

      await supabase
        .from('doctor_profiles')
        .update({
          full_name: fullName,
          clinic_id: invitation.clinic_id,
          rpps_number: formData.rppsNumber || null,
          phone_number: formData.phone || null,
          specialization: invitation.speciality ? [invitation.speciality] : [],
        })
        .eq('id', authData.user.id);

      await supabase
        .from('clinic_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      setShowSuccess(true);
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.message?.includes('User already registered')) {
        setError('Un compte existe déjà avec cette adresse email');
      } else {
        setError(error.message || 'Erreur lors de l\'inscription');
      }
    } finally {
      setRegistering(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-teal-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-teal-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Lien invalide ou expiré</h2>
          <p className="text-gray-600 mb-2">{error}</p>
          <p className="text-sm text-gray-500 mb-6">Contactez votre administrateur pour recevoir un nouveau lien.</p>
          <Button onClick={() => navigate('/')} className="w-full">
            Retour à la connexion
          </Button>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-teal-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Compte créé avec succès !</h2>
          <p className="text-lg text-gray-700 mb-2">
            Bienvenue dans l'équipe de <span className="font-semibold text-blue-600">{invitation?.clinic_name}</span>,
            Dr. {formData.lastName}
          </p>
          <p className="text-gray-600 mb-6">Vous allez être redirigé vers votre espace médecin...</p>

          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block text-blue-600">
                  Redirection dans {countdown}s
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-blue-100">
              <div
                style={{ width: `${((3 - countdown) / 3) * 100}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-blue-500 to-teal-500 transition-all duration-1000"
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-teal-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-teal-600 rounded-full flex items-center justify-center">
              <Heart className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">OrdoSur</h1>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Bienvenue sur OrdoSur</h2>
          <div className="inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full">
            <span className="text-blue-600 font-medium">Vous avez été invité(e) à rejoindre</span>
            <span className="font-bold text-blue-700">{invitation?.clinic_name}</span>
          </div>
          {invitation?.clinic_address && (
            <p className="text-sm text-gray-500 mt-2">{invitation.clinic_address}</p>
          )}
        </div>

        <form onSubmit={handleAcceptInvitation} className="space-y-5">
          <div>
            <Input
              label="Adresse e-mail"
              type="email"
              value={invitation?.email || ''}
              disabled
              icon={Mail}
            />
            <p className="mt-1 text-xs text-gray-500">Cette adresse email a été pré-remplie par votre invitation</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Prénom"
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="Jean"
              required
              icon={User}
            />
            <Input
              label="Nom"
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="Dupont"
              required
              icon={User}
            />
          </div>

          <div>
            <Input
              label="Mot de passe"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              required
              icon={Lock}
            />
            {formData.password && <PasswordStrengthIndicator password={formData.password} />}
            <p className="mt-1 text-xs text-gray-500">
              Minimum 8 caractères avec majuscule, minuscule, chiffre et caractère spécial
            </p>
          </div>

          <Input
            label="Confirmer le mot de passe"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            placeholder="••••••••"
            required
            icon={Lock}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Numéro RPPS (optionnel)"
              type="text"
              value={formData.rppsNumber}
              onChange={(e) => setFormData({ ...formData, rppsNumber: e.target.value })}
              placeholder="12345678901"
              icon={CreditCard}
            />
            <Input
              label="Téléphone (optionnel)"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+33 6 12 34 56 78"
              icon={Phone}
            />
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
            <input
              type="checkbox"
              id="acceptTerms"
              checked={formData.acceptTerms}
              onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="acceptTerms" className="text-sm text-gray-700">
              J'accepte les{' '}
              <a href="#" className="text-blue-600 hover:underline font-medium">
                conditions d'utilisation
              </a>{' '}
              et la{' '}
              <a href="#" className="text-blue-600 hover:underline font-medium">
                politique de confidentialité
              </a>
            </label>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" loading={registering}>
            Créer mon compte
          </Button>

          <p className="text-center text-sm text-gray-600">
            Vous avez déjà un compte ?{' '}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Se connecter
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
