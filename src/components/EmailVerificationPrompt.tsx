import { useState } from 'react';
import { Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { supabase } from '../lib/supabase';

interface EmailVerificationPromptProps {
  email: string;
  onClose?: () => void;
}

export function EmailVerificationPrompt({ email, onClose }: EmailVerificationPromptProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleResendEmail = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (resendError) throw resendError;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      if (err.message?.includes('rate limit')) {
        setError('Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.');
      } else {
        setError('Erreur lors de l\'envoi de l\'email. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-6">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-bold text-blue-900 mb-2">
            Vérification de votre email requise
          </h3>

          <p className="text-sm text-blue-800 mb-4">
            Pour accéder à votre compte, vous devez d'abord vérifier votre adresse email.
            Un email de confirmation a été envoyé à <strong>{email}</strong>
          </p>

          <div className="space-y-3 mb-4">
            <div className="flex items-start space-x-2 text-sm text-blue-700">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>Consultez votre boîte de réception et vos courriers indésirables</span>
            </div>
            <div className="flex items-start space-x-2 text-sm text-blue-700">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>Cliquez sur le lien de vérification dans l'email</span>
            </div>
            <div className="flex items-start space-x-2 text-sm text-blue-700">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>Revenez ensuite vous connecter</span>
            </div>
          </div>

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span className="text-sm text-green-800">Email de confirmation renvoyé avec succès</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleResendEmail}
              disabled={loading || success}
              variant="primary"
              className="flex-1"
            >
              {loading ? (
                <span className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Envoi en cours...</span>
                </span>
              ) : success ? (
                <span className="flex items-center justify-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Email envoyé</span>
                </span>
              ) : (
                'Renvoyer l\'email de confirmation'
              )}
            </Button>

            {onClose && (
              <Button
                onClick={onClose}
                variant="ghost"
                className="flex-1 sm:flex-initial"
              >
                Fermer
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
