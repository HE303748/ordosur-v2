import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Stethoscope, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { validatePassword, validateEmail, validatePhoneNumber, validateRPPSNumber, sanitizeInput, sanitizeInputFinal } from '../lib/validation';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

const SPECIALITES = [
  'Médecin généraliste',
  'Cardiologue',
  'Pédiatre',
  'Chirurgien',
  'Pharmacien',
  'Dermatologue',
  'Ophtalmologue',
  'Gynécologue',
  'Psychiatre',
  'Radiologue',
  'Autre',
];

// Champ requis avec astérisque rouge
function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <span>
      {children} <span className="text-red-500">*</span>
    </span>
  );
}

export function DoctorRegistrationPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    email: '',
    password: '',
    confirmPassword: '',
    rpps: '',
    specialite: '',
    ordre_number: '',
    nom_cabinet: '',
    adresse: '',
    telephone: '',
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

    if (!formData.prenom.trim() || !formData.nom.trim()) {
      setError('Prénom et nom sont obligatoires');
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

    if (!validateRPPSNumber(formData.rpps)) {
      setError('Numéro RPPS invalide (11 chiffres requis)');
      return;
    }

    if (!formData.specialite) {
      setError('Veuillez sélectionner une spécialité');
      return;
    }

    if (!formData.nom_cabinet.trim()) {
      setError('Le nom du cabinet est obligatoire');
      return;
    }

    if (!formData.adresse.trim()) {
      setError("L'adresse du cabinet est obligatoire");
      return;
    }

    if (!validatePhoneNumber(formData.telephone)) {
      setError('Numéro de téléphone invalide (format : +212 6XX XXX XXX)');
      return;
    }

    if (!formData.acceptTerms) {
      setError('Vous devez accepter les conditions générales');
      return;
    }

    setLoading(true);

    try {
      await signUp(formData.email, formData.password, 'doctor', {
        prenom: sanitizeInputFinal(formData.prenom),
        nom: sanitizeInputFinal(formData.nom),
        org_name: sanitizeInputFinal(formData.nom_cabinet),
        org_type: 'cabinet',
        adresse: sanitizeInputFinal(formData.adresse),
        telephone: formData.telephone,
        rpps: formData.rpps,
        specialite: formData.specialite,
        ordre_number: formData.ordre_number || undefined,
      });

      navigate('/registration-success', { state: { email: formData.email } });
    } catch (err: any) {
      if (err.message?.includes('already registered')) {
        setError('Cette adresse email est déjà utilisée');
      } else {
        setError(err.message || "Une erreur est survenue lors de l'inscription");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex">
      {/* Panneau gauche */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-secondary-500 to-secondary-600 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>

        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-white/20 backdrop-blur-lg rounded-xl">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">OrdoSur</h1>
          </div>
          <div className="flex items-center space-x-3 mb-4">
            <Stethoscope className="w-12 h-12 text-white/80" />
            <div>
              <h2 className="text-2xl font-bold text-white">Inscription Médecin</h2>
              <p className="text-white/80">Rejoignez notre réseau de professionnels</p>
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

      {/* Formulaire */}
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Créer un compte médecin</h2>
            <p className="text-gray-500 text-sm mb-6">
              Les champs marqués <span className="text-red-500 font-semibold">*</span> sont obligatoires
            </p>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Identité */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <RequiredLabel>Prénom</RequiredLabel>
                  </label>
                  <input
                    name="prenom"
                    type="text"
                    value={formData.prenom}
                    onChange={handleChange}
                    required
                    placeholder="Mohammed"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <RequiredLabel>Nom</RequiredLabel>
                  </label>
                  <input
                    name="nom"
                    type="text"
                    value={formData.nom}
                    onChange={handleChange}
                    required
                    placeholder="Benali"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <RequiredLabel>Email professionnel</RequiredLabel>
                </label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="m.benali@cabinet.ma"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              {/* Mot de passe */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <RequiredLabel>Mot de passe</RequiredLabel>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent outline-none transition-all"
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
                  <RequiredLabel>Confirmer le mot de passe</RequiredLabel>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent outline-none transition-all"
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

              {/* Infos professionnelles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <RequiredLabel>Numéro RPPS</RequiredLabel>
                </label>
                <input
                  name="rpps"
                  type="text"
                  value={formData.rpps}
                  onChange={handleChange}
                  required
                  placeholder="12345678901"
                  maxLength={11}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <RequiredLabel>Spécialité</RequiredLabel>
                </label>
                <select
                  name="specialite"
                  value={formData.specialite}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="">Sélectionner une spécialité</option>
                  {SPECIALITES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro Ordre (optionnel)
                </label>
                <input
                  name="ordre_number"
                  type="text"
                  value={formData.ordre_number}
                  onChange={handleChange}
                  placeholder="Numéro d'ordre du conseil médical"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              {/* Cabinet */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <RequiredLabel>Nom du cabinet</RequiredLabel>
                </label>
                <input
                  name="nom_cabinet"
                  type="text"
                  value={formData.nom_cabinet}
                  onChange={handleChange}
                  required
                  placeholder="Cabinet Médical Benali"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <RequiredLabel>Adresse du cabinet</RequiredLabel>
                </label>
                <input
                  name="adresse"
                  type="text"
                  value={formData.adresse}
                  onChange={handleChange}
                  required
                  placeholder="123 Boulevard Mohammed V, Casablanca"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <RequiredLabel>Téléphone</RequiredLabel>
                </label>
                <input
                  name="telephone"
                  type="tel"
                  value={formData.telephone}
                  onChange={handleChange}
                  required
                  placeholder="+212 6XX XXX XXX"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                  className="mt-1 w-4 h-4 text-secondary-600 border-gray-300 rounded focus:ring-secondary-500"
                />
                <label className="text-sm text-gray-600">
                  J'accepte les conditions générales d'utilisation et la politique de confidentialité{' '}
                  <span className="text-red-500">*</span>
                </label>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700"
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
