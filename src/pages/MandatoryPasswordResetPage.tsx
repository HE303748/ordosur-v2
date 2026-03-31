import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';
import { Toast } from '../components/Toast';
import { Lock, AlertCircle, CheckCircle, Shield, Clock } from 'lucide-react';

export function MandatoryPasswordResetPage() {
  const navigate = useNavigate();
  const { user, completeMandatoryPasswordReset, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetInfo, setResetInfo] = useState<{
    reason: string | null;
    expiresAt: string | null;
  }>({ reason: null, expiresAt: null });

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadResetInfo();
  }, [user]);

  async function loadResetInfo() {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('check_mandatory_password_reset', {
        check_user_id: user.id,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setResetInfo({
          reason: data[0].reason || null,
          expiresAt: data[0].expires_at || null,
        });
      }
    } catch (error) {
      console.error('Error loading reset info:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!user) {
      setError('Utilisateur non connecté');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.newPassword.length < 12) {
      setError('Le mot de passe doit contenir au moins 12 caractères');
      return;
    }

    if (!/[A-Z]/.test(formData.newPassword)) {
      setError('Le mot de passe doit contenir au moins une lettre majuscule');
      return;
    }

    if (!/[a-z]/.test(formData.newPassword)) {
      setError('Le mot de passe doit contenir au moins une lettre minuscule');
      return;
    }

    if (!/[0-9]/.test(formData.newPassword)) {
      setError('Le mot de passe doit contenir au moins un chiffre');
      return;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.newPassword)) {
      setError('Le mot de passe doit contenir au moins un caractère spécial');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('Le nouveau mot de passe doit être différent du mot de passe temporaire');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword,
      });

      if (updateError) throw updateError;

      await completeMandatoryPasswordReset(user.id);

      await supabase.rpc('log_auth_event', {
        log_user_id: user.id,
        log_email: user.email,
        log_event_type: 'password_reset_completed',
        log_success: true,
        log_details: {
          reset_type: 'mandatory',
          reset_reason: resetInfo.reason,
        },
      });

      setSuccess('Mot de passe changé avec succès ! Redirection...');

      setTimeout(() => {
        if (user.role === 'doctor') {
          navigate('/doctor/dashboard');
        } else if (user.role === 'clinic' || user.role === 'clinic_admin') {
          navigate('/clinic/admin');
        } else {
          navigate('/');
        }
      }, 2000);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      setError(error.message || 'Erreur lors du changement de mot de passe');

      await supabase.rpc('log_auth_event', {
        log_user_id: user.id,
        log_email: user.email,
        log_event_type: 'password_reset_completed',
        log_success: false,
        log_failure_reason: error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await signOut();
    navigate('/login');
  }

  const expirationDate = resetInfo.expiresAt ? new Date(resetInfo.expiresAt) : null;
  const isExpired = expirationDate ? expirationDate < new Date() : false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Changement de mot de passe obligatoire
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Pour des raisons de sécurité, vous devez changer votre mot de passe temporaire avant d'accéder au système
          </p>

          {isExpired && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-1">
                    Mot de passe temporaire expiré
                  </h3>
                  <p className="text-sm text-red-700">
                    Votre mot de passe temporaire a expiré. Veuillez contacter votre administrateur pour obtenir un nouveau mot de passe.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isExpired && resetInfo.reason && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">
                    Raison du changement
                  </h3>
                  <p className="text-sm text-blue-700">
                    {resetInfo.reason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isExpired && expirationDate && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-900 mb-1">
                    Date d'expiration
                  </h3>
                  <p className="text-sm text-amber-700">
                    Votre mot de passe temporaire expire le{' '}
                    {expirationDate.toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

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

          {!isExpired && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-gray-600" />
                  Exigences de sécurité du mot de passe
                </h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Minimum 12 caractères</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Au moins une lettre majuscule (A-Z)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Au moins une lettre minuscule (a-z)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Au moins un chiffre (0-9)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Au moins un caractère spécial (!@#$%^&*...)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Différent du mot de passe temporaire</span>
                  </li>
                </ul>
              </div>

              <Input
                label="Mot de passe temporaire actuel"
                type="password"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                placeholder="Entrez votre mot de passe temporaire"
                required
                icon={Lock}
              />

              <Input
                label="Nouveau mot de passe"
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                placeholder="Entrez votre nouveau mot de passe"
                required
                icon={Lock}
              />

              <PasswordStrengthIndicator password={formData.newPassword} />

              <Input
                label="Confirmer le nouveau mot de passe"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Confirmez votre nouveau mot de passe"
                required
                icon={Lock}
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleLogout}
                  className="flex-1"
                >
                  Se déconnecter
                </Button>
                <Button
                  type="submit"
                  loading={loading}
                  className="flex-1"
                >
                  Changer le mot de passe
                </Button>
              </div>
            </form>
          )}

          {isExpired && (
            <div className="pt-4">
              <Button
                onClick={handleLogout}
                variant="secondary"
                className="w-full"
              >
                Retour à la connexion
              </Button>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Besoin d'aide ? Contactez votre administrateur système
          </p>
        </div>
      </div>
    </div>
  );
}
