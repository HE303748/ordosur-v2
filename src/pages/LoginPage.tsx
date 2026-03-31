import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Stethoscope, Heart, Shield, Activity, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { validateEmail } from '../lib/validation';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { EmailVerificationPrompt } from '../components/EmailVerificationPrompt';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  useEffect(() => {
    if (user && !authLoading) {
      // IMPORTANT: Do NOT redirect if we're on auth callback or reset password routes
      const currentPath = window.location.pathname;
      if (currentPath === '/auth/callback' || currentPath === '/reset-password') {
        console.log('[LOGIN PAGE] Skipping redirect - on auth callback or reset password route');
        return;
      }

      console.log('[LOGIN PAGE] User authenticated, redirecting to dashboard. Role:', user.role);
      if (user.role === 'clinic_admin') {
        navigate('/clinic/admin', { replace: true });
      } else if (user.role === 'clinic') {
        navigate('/clinic', { replace: true });
      } else if (user.role === 'doctor') {
        navigate('/doctor', { replace: true });
      }
    }
  }, [user, authLoading, navigate]);

  // Show success message if coming from password reset
  useEffect(() => {
    if (searchParams.get('reset') === 'success') {
      setSuccessMessage('Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.');
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [searchParams]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(formData.email)) {
      setError('Adresse email invalide');
      return;
    }

    if (!formData.password) {
      setError('Veuillez entrer votre mot de passe');
      return;
    }

    setLoading(true);

    try {
      await signIn(formData.email, formData.password);
    } catch (err: any) {
      if (err.message?.includes('verrouillé')) {
        setError(err.message);
      } else if (err.message?.includes('Invalid login credentials')) {
        setError('Email ou mot de passe incorrect');
      } else if (err.message?.includes('Email not confirmed') || err.message?.includes('email_not_verified')) {
        setUnverifiedEmail(formData.email);
        setShowEmailVerification(true);
        setError('');
      } else {
        setError('Une erreur est survenue lors de la connexion');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-secondary-600 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>

        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-white/20 backdrop-blur-lg rounded-xl">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">OrdoSur</h1>
          </div>
          <p className="text-white/90 text-lg">
            Plateforme médicale intelligente pour la gestion des interactions médicamenteuses
          </p>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex items-start space-x-4">
            <Shield className="w-6 h-6 text-white/80 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-white font-semibold mb-1">Sécurité Maximale</h3>
              <p className="text-white/80 text-sm">Vérification automatique des interactions dangereuses</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <Activity className="w-6 h-6 text-white/80 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-white font-semibold mb-1">Temps Réel</h3>
              <p className="text-white/80 text-sm">Analyses instantanées et alertes immédiates</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <Stethoscope className="w-6 h-6 text-white/80 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-white font-semibold mb-1">Expertise Médicale</h3>
              <p className="text-white/80 text-sm">Base de données complète validée par des professionnels</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="p-3 bg-primary-100 rounded-xl">
                <Heart className="w-8 h-8 text-primary-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">OrdoSur</h1>
            </div>
          </div>

          <div className="glass-effect rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Connexion</h2>
            <p className="text-gray-600 mb-6">Accédez à votre compte professionnel</p>

            {showEmailVerification && unverifiedEmail && (
              <EmailVerificationPrompt
                email={unverifiedEmail}
                onClose={() => {
                  setShowEmailVerification(false);
                  setUnverifiedEmail('');
                }}
              />
            )}

            {successMessage && (
              <div className="mb-4 p-4 bg-success-50 border border-success-200 rounded-xl flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" />
                <span className="text-success-600 text-sm">{successMessage}</span>
              </div>
            )}

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <span className="text-red-600 text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mb-6">
              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="votre.email@exemple.fr"
                autoComplete="email"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-600">Se souvenir de moi</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
                >
                  Mot de passe oublié?
                </button>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600"
              >
                {loading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Connexion...</span>
                  </span>
                ) : (
                  'Se connecter'
                )}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Pas encore de compte ?{' '}
                <button
                  onClick={() => navigate('/register')}
                  className="text-primary-600 font-semibold hover:underline"
                >
                  S'inscrire
                </button>
              </p>
            </div>
          </div>

          <ForgotPasswordModal
            isOpen={showForgotPassword}
            onClose={() => setShowForgotPassword(false)}
          />
        </div>
      </div>
    </div>
  );
}
