import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle, Lock, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { validatePassword } from '../lib/validation';
import { Button } from '../components/Button';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  // Sprint #3.0.4 — Détection recovery via le pattern Supabase v2 natif :
  //   1. Lecture du hash URL au mount (#type=recovery)
  //   2. Écoute de onAuthStateChange('PASSWORD_RECOVERY') au cas où l'event
  //      arrive après le mount du composant
  //   3. Vérification de la session active via getSession() (Supabase parse
  //      le hash automatiquement et crée la session)
  // Plus aucun localStorage maison — c'est Supabase qui gère.
  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const hasRecoveryHash = hashParams.get('type') === 'recovery';

    console.log('[RESET PASSWORD] Mount — hasRecoveryHash:', hasRecoveryHash);

    // Listener — si Supabase fire PASSWORD_RECOVERY après le mount, on l'attrape.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' && session) {
        console.log('[RESET PASSWORD] PASSWORD_RECOVERY event received');
        setSessionReady(true);
        setSessionLoading(false);
        setError('');
      }
    });

    if (hasRecoveryHash) {
      // Hash présent → laisse 500 ms à Supabase pour parser le hash et créer la session,
      // puis vérifie via getSession (idempotent avec l'event ci-dessus).
      timeoutId = setTimeout(async () => {
        if (!mounted) return;
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('[RESET PASSWORD] Session error:', sessionError);
          setError('Erreur lors de la vérification du lien.');
          setSessionReady(false);
        } else if (session) {
          console.log('[RESET PASSWORD] Recovery session active');
          setSessionReady(true);
        } else {
          console.log('[RESET PASSWORD] Hash present but no session created');
          setError('Lien invalide ou expiré. Veuillez demander un nouveau lien de réinitialisation.');
          setSessionReady(false);
        }
        setSessionLoading(false);
      }, 500);
    } else {
      // Pas de hash recovery → accès direct illégitime. Mais on attend 600 ms
      // au cas où le listener PASSWORD_RECOVERY ait quelque chose à dire (race rare).
      timeoutId = setTimeout(() => {
        if (!mounted) return;
        // Si le listener a déjà setSessionReady(true), on ne touche rien.
        // Sinon on affiche "lien invalide".
        setSessionLoading(prev => {
          if (!prev) return prev; // déjà terminé par le listener
          setError('Lien invalide ou expiré. Veuillez demander un nouveau lien de réinitialisation.');
          setSessionReady(false);
          return false;
        });
      }, 600);
    }

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  // Sprint #3.0.4 — La session recovery est une session Supabase active.
  // Si l'utilisateur clique "Retour à la connexion" sans valider, il faut signOut
  // sinon le routeur le redirige vers /doctor (bug observé).
  const handleReturnToLogin = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('[RESET PASSWORD] signOut error (non-blocking):', e);
    }
    navigate('/');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError('');

    // Clear field-specific errors when user starts typing
    if (name === 'password') {
      setPasswordError('');
    } else if (name === 'confirmPassword') {
      setConfirmError('');
    }
  };

  const validateForm = (): boolean => {
    let isValid = true;
    setPasswordError('');
    setConfirmError('');

    // Validate password
    if (!formData.password) {
      setPasswordError('Le mot de passe est requis');
      isValid = false;
    } else if (formData.password.length < 8) {
      setPasswordError('Le mot de passe doit contenir au moins 8 caractères');
      isValid = false;
    } else {
      // Check password strength using validation function
      const passwordStrength = validatePassword(formData.password);
      if (!passwordStrength.hasUppercase || !passwordStrength.hasLowercase ||
          !passwordStrength.hasNumber || !passwordStrength.hasSpecialChar) {
        setPasswordError('Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial');
        isValid = false;
      }
    }

    // Validate confirm password
    if (!formData.confirmPassword) {
      setConfirmError('Veuillez confirmer le mot de passe');
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      setConfirmError('Les mots de passe ne correspondent pas');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    // Check if we have a valid session
    if (!sessionReady) {
      setError('Session invalide. Veuillez demander un nouveau lien de réinitialisation.');
      return;
    }

    setLoading(true);

    try {
      console.log('[RESET PASSWORD] Attempting to update password...');

      // Update password via Supabase using the established session
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (updateError) {
        console.error('[RESET PASSWORD] Update error:', updateError);

        // Handle specific error cases with user-friendly messages
        if (updateError.message.includes('not authenticated')) {
          setError('Votre session a expiré. Veuillez demander un nouveau lien de réinitialisation.');
        } else if (updateError.message.includes('same as the old password')) {
          setError('Le nouveau mot de passe doit être différent de l\'ancien');
        } else if (updateError.message.includes('weak password')) {
          setError('Le mot de passe proposé est trop faible');
        } else {
          setError('Erreur lors de la réinitialisation: ' + updateError.message);
        }
        setLoading(false);
        return;
      }

      console.log('[RESET PASSWORD] Password updated successfully');

      // Success - show success message and sign out user
      setSuccess(true);

      // Sign out the user to ensure they use the new password
      await supabase.auth.signOut();

      // Redirect to login page after 2 seconds
      setTimeout(() => {
        navigate('/?reset=success', { replace: true });
      }, 2000);
    } catch (err: any) {
      console.error('[RESET PASSWORD] Unexpected error:', err);
      setError('Une erreur inattendue est survenue. Veuillez réessayer.');
      setLoading(false);
    }
  };

  // Show loading state while verifying session
  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7] p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#00A86B] border-t-transparent"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Vérification en cours...</h2>
          <p className="text-gray-600 text-sm">Veuillez patienter pendant que nous vérifions votre lien de réinitialisation.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7] p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-success-50 rounded-full">
              <CheckCircle className="w-16 h-16 text-success-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Mot de passe réinitialisé !</h2>
          <p className="text-gray-600 mb-4">Votre mot de passe a été mis à jour avec succès.</p>
          <p className="text-sm text-gray-500">Redirection vers la page de connexion dans 2 secondes...</p>
          <div className="mt-6 flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#00A86B] border-t-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7] p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-[#E6F4EE] rounded-xl">
            <Lock className="w-6 h-6 text-[#00A86B]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Réinitialiser le mot de passe</h1>
        </div>

        <p className="text-gray-600 text-sm mb-6">
          Entrez votre nouveau mot de passe ci-dessous. Assurez-vous qu'il respecte tous les critères de sécurité.
        </p>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Only show form if we have a valid session */}
        {sessionReady ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Entrez votre nouveau mot de passe"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-offset-0 focus:outline-none transition-all ${
                    passwordError
                      ? 'border-red-300 focus:ring-red-200 bg-red-50'
                      : 'border-gray-300 focus:ring-[#00A86B] bg-white'
                  }`}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {passwordError && (
                <p className="mt-1.5 text-sm text-red-600">{passwordError}</p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Minimum 8 caractères avec majuscule, minuscule, chiffre et caractère spécial
              </p>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirmez votre mot de passe"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-offset-0 focus:outline-none transition-all ${
                    confirmError
                      ? 'border-red-300 focus:ring-red-200 bg-red-50'
                      : 'border-gray-300 focus:ring-[#00A86B] bg-white'
                  }`}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {confirmError && (
                <p className="mt-1.5 text-sm text-red-600">{confirmError}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-[#00A86B] hover:bg-[#006B47] text-white"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Mise à jour en cours...
                </span>
              ) : (
                'Réinitialiser le mot de passe'
              )}
            </Button>
          </form>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Le lien de réinitialisation n'est pas valide ou a expiré.</p>
            <Button
              onClick={handleReturnToLogin}
              className="bg-[#00A86B] hover:bg-[#006B47] text-white"
            >
              Retour à la connexion
            </Button>
          </div>
        )}

        {/* Back to Login Link */}
        <button
          onClick={handleReturnToLogin}
          disabled={loading}
          className="w-full mt-6 flex items-center justify-center gap-2 text-[#00A86B] hover:text-[#006B47] font-medium text-sm transition-colors disabled:opacity-50"
        >
          <ArrowLeft size={16} />
          Retour à la connexion
        </button>
      </div>
    </div>
  );
}
