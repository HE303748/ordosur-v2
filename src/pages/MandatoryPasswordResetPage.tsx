import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';
import { validatePassword } from '../lib/validation';
import { Lock, Shield } from 'lucide-react';

// Cette page permet un changement de mot de passe simple.
// La fonctionnalitÃƒÂ© "mot de passe temporaire obligatoire" de v1 (RPCs supprimÃƒÂ©s) n'existe plus en v2.

export function MandatoryPasswordResetPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const passwordStrength = validatePassword(formData.newPassword);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!user) {
      setError('Utilisateur non connectÃƒÂ©');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordStrength.score < 5) {
      setError('Le mot de passe ne rÃƒÂ©pond pas ÃƒÂ  tous les critÃƒÂ¨res de sÃƒÂ©curitÃƒÂ©');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword,
      });

      if (updateError) throw updateError;

      setSuccess('Mot de passe changÃƒÂ© avec succÃƒÂ¨s ! Redirection...');

      setTimeout(() => {
        if (user.role === 'doctor') {
          navigate('/doctor');
        } else if (user.role === 'clinic_admin') {
          navigate('/clinic/admin');
        } else {
          navigate('/');
        }
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAFAF7] via-white to-[#E6F4EE] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Changement de mot de passe
          </h1>
          <p className="text-center text-gray-600 mb-8 text-sm">
            Choisissez un nouveau mot de passe sÃƒÂ©curisÃƒÂ©
          </p>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label="Nouveau mot de passe"
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                placeholder="Entrez votre nouveau mot de passe"
                required
                icon={Lock}
              />
              <PasswordStrengthIndicator strength={passwordStrength} password={formData.newPassword} />
            </div>

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
                Se dÃƒÂ©connecter
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
        </div>
      </div>
    </div>
  );
}
