import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Stethoscope, Building2, ArrowLeft, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { validatePassword, validateEmail, sanitizeInput } from '../lib/validation';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    account_type: '' as 'doctor' | 'clinic' | '',
    acceptTerms: false,
  });

  const passwordStrength = validatePassword(formData.password);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : sanitizeInput(value),
    }));
    setError('');
  };

  const handleAccountTypeSelect = (type: 'doctor' | 'clinic') => {
    setFormData(prev => ({ ...prev, account_type: type }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.account_type) {
      setError('Veuillez sélectionner un type de compte');
      return;
    }

    if (!formData.full_name.trim()) {
      setError('Veuillez entrer votre nom complet');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Adresse email invalide');
      return;
    }

    if (passwordStrength.score < 5) {
      setError('Le mot de passe ne répond pas à tous les critères de sécurité');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (!formData.acceptTerms) {
      setError('Vous devez accepter les conditions générales');
      return;
    }

    setLoading(true);

    try {
      await signUp(formData.email, formData.password, formData.account_type, {
        full_name: formData.full_name,
      });

      navigate('/registration-success', { state: { email: formData.email } });
    } catch (err: any) {
      if (err.message?.includes('already registered')) {
        setError('Cette adresse email est déjà utilisée');
      } else {
        setError(err.message || 'Une erreur est survenue lors de l\'inscription');
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
          <p className="text-white/90 text-lg mb-8">
            Rejoignez la plateforme médicale la plus avancée
          </p>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Pour les Médecins</h3>
                <p className="text-white/80 text-sm">Gérez vos patients et consultations</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Pour les Cliniques</h3>
                <p className="text-white/80 text-sm">Supervisez votre équipe médicale</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/80 text-sm">
            Déjà inscrit ?{' '}
            <button
              onClick={() => navigate('/')}
              className="text-white font-semibold hover:underline"
            >
              Se connecter
            </button>
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour à la connexion</span>
          </button>

          <div className="lg:hidden mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="p-3 bg-primary-100 rounded-xl">
                <Heart className="w-8 h-8 text-primary-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">OrdoSur</h1>
            </div>
          </div>

          <div className="glass-effect rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Créer un compte</h2>
            <p className="text-gray-600 mb-6">Commencez en quelques secondes</p>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <span className="text-red-600 text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de compte *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleAccountTypeSelect('doctor')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.account_type === 'doctor'
                        ? 'border-secondary-500 bg-secondary-50'
                        : 'border-gray-200 hover:border-secondary-300'
                    }`}
                  >
                    <Stethoscope className={`w-8 h-8 mx-auto mb-2 ${
                      formData.account_type === 'doctor' ? 'text-secondary-600' : 'text-gray-400'
                    }`} />
                    <div className="text-sm font-semibold text-gray-900">Médecin</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAccountTypeSelect('clinic')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      formData.account_type === 'clinic'
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300'
                    }`}
                  >
                    <Building2 className={`w-8 h-8 mx-auto mb-2 ${
                      formData.account_type === 'clinic' ? 'text-primary-600' : 'text-gray-400'
                    }`} />
                    <div className="text-sm font-semibold text-gray-900">Clinique</div>
                  </button>
                </div>
              </div>

              <Input
                label="Nom complet"
                name="full_name"
                type="text"
                value={formData.full_name}
                onChange={handleChange}
                required
                placeholder={formData.account_type === 'clinic' ? 'Nom de la clinique' : 'Votre nom complet'}
              />

              <Input
                label="Adresse e-mail"
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
                  Mot de passe *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
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
                <PasswordStrengthIndicator strength={passwordStrength} password={formData.password} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le mot de passe *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                  className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label className="text-sm text-gray-600">
                  J'accepte les conditions générales d'utilisation et la politique de confidentialité *
                </label>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600"
              >
                {loading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Création en cours...</span>
                  </span>
                ) : (
                  'Créer mon compte'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Déjà inscrit ?{' '}
                <button
                  onClick={() => navigate('/')}
                  className="text-primary-600 font-semibold hover:underline"
                >
                  Se connecter
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
