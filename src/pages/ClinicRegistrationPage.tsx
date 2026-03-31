import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Building2, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { validatePassword, validateEmail, validatePhoneNumber, sanitizeInput, sanitizeInputFinal, validateFullName } from '../lib/validation';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export function ClinicRegistrationPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    clinic_name: '',
    business_registration_number: '',
    address_street: '',
    address_city: '',
    address_postal_code: '',
    address_country: 'France',
    primary_contact_name: '',
    phone_number: '',
    acceptTerms: false,
  });

  const passwordStrength = validatePassword(formData.password);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : sanitizeInput(value),
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateFullName(formData.primary_contact_name)) {
      setError('Le nom du contact doit contenir au moins un prénom et un nom de famille');
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

    if (!validatePhoneNumber(formData.phone_number)) {
      setError('Numéro de téléphone invalide');
      return;
    }

    if (!formData.acceptTerms) {
      setError('Vous devez accepter les conditions générales');
      return;
    }

    setLoading(true);

    try {
      await signUp(formData.email, formData.password, 'clinic', {
        clinic_name: sanitizeInputFinal(formData.clinic_name),
        business_registration_number: formData.business_registration_number,
        address_street: formData.address_street,
        address_city: formData.address_city,
        address_postal_code: formData.address_postal_code,
        address_country: formData.address_country,
        primary_contact_name: sanitizeInputFinal(formData.primary_contact_name),
        phone_number: formData.phone_number,
      });

      navigate('/registration-success', { state: { email: formData.email } });
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-500 to-primary-600 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>

        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-white/20 backdrop-blur-lg rounded-xl">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">OrdoSur</h1>
          </div>
          <div className="flex items-center space-x-3 mb-4">
            <Building2 className="w-12 h-12 text-white/80" />
            <div>
              <h2 className="text-2xl font-bold text-white">Inscription Clinique</h2>
              <p className="text-white/80">Gérez votre établissement de santé</p>
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
            onClick={() => navigate('/register')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour</span>
          </button>

          <div className="glass-effect rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Créer un compte clinique</h2>
            <p className="text-gray-600 mb-6">Remplissez les informations ci-dessous</p>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Nom de la clinique"
                name="clinic_name"
                type="text"
                value={formData.clinic_name}
                onChange={handleChange}
                required
                placeholder="Clinique Saint-Martin"
              />

              <Input
                label="Numéro SIRET"
                name="business_registration_number"
                type="text"
                value={formData.business_registration_number}
                onChange={handleChange}
                required
                placeholder="12345678901234"
              />

              <Input
                label="Email professionnel"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="contact@clinique.fr"
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
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
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
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
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

              <Input
                label="Nom du contact principal"
                name="primary_contact_name"
                type="text"
                value={formData.primary_contact_name}
                onChange={handleChange}
                required
                placeholder="Directeur administratif"
              />

              <Input
                label="Numéro de téléphone"
                name="phone_number"
                type="tel"
                value={formData.phone_number}
                onChange={handleChange}
                required
                placeholder="+33 1 23 45 67 89"
              />

              <Input
                label="Adresse"
                name="address_street"
                type="text"
                value={formData.address_street}
                onChange={handleChange}
                required
                placeholder="123 Rue de la Santé"
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Ville"
                  name="address_city"
                  type="text"
                  value={formData.address_city}
                  onChange={handleChange}
                  required
                  placeholder="Paris"
                />

                <Input
                  label="Code postal"
                  name="address_postal_code"
                  type="text"
                  value={formData.address_postal_code}
                  onChange={handleChange}
                  required
                  placeholder="75001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pays
                </label>
                <select
                  name="address_country"
                  value={formData.address_country}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="France">France</option>
                  <option value="Belgique">Belgique</option>
                  <option value="Suisse">Suisse</option>
                  <option value="Canada">Canada</option>
                </select>
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
                  J'accepte les conditions générales d'utilisation et la politique de confidentialité
                </label>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700"
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
          </div>
        </div>
      </div>
    </div>
  );
}
