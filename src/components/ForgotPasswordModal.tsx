import { useState } from 'react';
import { X, AlertCircle, CheckCircle, Mail, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { validateEmail } from '../lib/validation';
import { useResendRateLimit } from '../hooks/useResendRateLimit';
import { Button } from './Button';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const { requestPasswordReset } = useAuth();
  const { isDisabled, secondsRemaining, startCooldown } = useResendRateLimit(60);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setEmailError('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');

    if (!email) {
      setEmailError('Veuillez entrer votre adresse email');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Adresse email invalide');
      return;
    }

    setLoading(true);

    try {
      await requestPasswordReset(email);
      setSuccess(true);
      startCooldown();
      setEmail('');

      // Auto-close modal after 3 seconds
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.message?.includes('rate limit') || err.message?.includes('Too many requests')) {
        setError('Trop de tentatives. Veuillez attendre quelques minutes avant de réessayer.');
      } else {
        setError('Erreur lors de l\'envoi du lien de réinitialisation');
      }
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-neutral-900">Réinitialiser le mot de passe</h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-12 h-12 text-success-500" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Email envoyé</h3>
              <p className="text-neutral-600 text-sm">
                Vérifiez votre boîte email pour le lien de réinitialisation. Fermeture automatique...
              </p>
            </div>
          ) : (
            <>
              <p className="text-neutral-600 text-sm mb-4">
                Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-lg flex gap-2">
                  <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-error-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-medium text-neutral-700 mb-1">
                    Adresse email
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={handleChange}
                    placeholder="votre@email.com"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-offset-0 focus:outline-none transition-all ${
                      emailError
                        ? 'border-error-300 focus:ring-error-200 bg-error-50'
                        : 'border-neutral-300 focus:ring-primary-200 bg-white'
                    }`}
                    disabled={loading || isDisabled}
                  />
                  {emailError && (
                    <p className="mt-1 text-sm text-error-600">{emailError}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading || isDisabled}
                  className="w-full"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Envoi en cours...
                    </span>
                  ) : isDisabled ? (
                    `Réessai dans ${secondsRemaining}s`
                  ) : (
                    'Envoyer le lien'
                  )}
                </Button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200">
          <button
            onClick={onClose}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    </div>
  );
}
