import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Heart, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

export function RegistrationSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const getEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      } else if (location.state?.email) {
        setUserEmail(location.state.email);
      }
    };
    getEmail();
  }, [location]);

  const handleResendEmail = async () => {
    if (!userEmail) {
      setError('Email introuvable. Veuillez vous reconnecter.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
      });

      if (resendError) throw resendError;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      if (err.message?.includes('rate limit')) {
        setError('Trop de tentatives. Veuillez patienter quelques minutes.');
      } else {
        setError('Erreur lors de l\'envoi. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center space-x-3 mb-4">
            <div className="p-3 bg-primary-100 rounded-xl">
              <Heart className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">OrdoSur</h1>
          </div>
        </div>

        <div className="glass-effect rounded-3xl p-8 shadow-2xl text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Inscription réussie !
          </h2>

          <div className="mb-6 p-4 bg-blue-50 rounded-xl">
            <Mail className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <p className="text-gray-700 mb-2">
              Un email de vérification a été envoyé à votre adresse.
            </p>
            <p className="text-sm text-gray-600">
              Veuillez consulter votre boîte de réception et cliquer sur le lien de confirmation pour activer votre compte.
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-start space-x-3 text-left text-sm text-gray-600">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span>Vérifiez votre dossier de courrier indésirable si vous ne voyez pas l'email</span>
            </div>
            <div className="flex items-start space-x-3 text-left text-sm text-gray-600">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span>Le lien de vérification est valable pendant 24 heures</span>
            </div>
            <div className="flex items-start space-x-3 text-left text-sm text-gray-600">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span>Vous pourrez vous connecter une fois votre email vérifié</span>
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

          <div className="space-y-3">
            <Button
              onClick={handleResendEmail}
              disabled={loading || success || !userEmail}
              variant="ghost"
              className="w-full border-2 border-blue-200 hover:bg-blue-50"
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
                <span className="flex items-center justify-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>Renvoyer l'email de confirmation</span>
                </span>
              )}
            </Button>

            <Button
              onClick={() => navigate('/')}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700"
            >
              Retour à la connexion
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
