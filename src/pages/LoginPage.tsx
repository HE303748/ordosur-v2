import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Shield, Stethoscope, Building2, Eye, EyeOff,
  Loader2, AlertCircle, CheckCircle, ArrowRight, Lock, Mail,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { validateEmail } from '../lib/validation';
import { EmailVerificationPrompt } from '../components/EmailVerificationPrompt';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';
import { Logo } from '../components/Logo';

/* ── Feature row ── */
function Feature({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-md bg-white/[0.08] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-[#00A86B]" />
      </div>
      <div>
        <p className="text-white font-semibold text-sm">{title}</p>
        <p className="text-white/50 text-sm mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

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
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });

  useEffect(() => {
    if (user && !authLoading) {
      const currentPath = window.location.pathname;
      if (currentPath === '/auth/callback' || currentPath === '/reset-password') return;
      if (user.role === 'super_admin') navigate('/super-admin', { replace: true });
      else if (user.role === 'clinic_admin') navigate('/clinic/admin', { replace: true });
      else if (user.role === 'doctor') navigate('/doctor', { replace: true });
      else if (user.role === 'secretaire') navigate('/secretaire', { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (searchParams.get('reset') === 'success') {
      setSuccessMessage('Mot de passe réinitialisé. Vous pouvez maintenant vous connecter.');
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [searchParams]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A1628]">
        <div className="flex flex-col items-center gap-4">
          <Logo variant="symbol-dark" size="lg" />
          <div className="w-6 h-6 border-2 border-[#00A86B] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateEmail(formData.email)) { setError('Adresse email invalide'); return; }
    if (!formData.password) { setError('Veuillez entrer votre mot de passe'); return; }
    setLoading(true);
    try {
      await signIn(formData.email, formData.password);
    } catch (err: any) {
      if (err.message?.includes('Invalid login credentials')) {
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
    <div className="min-h-screen bg-[#FAFAF7] flex">
      {/* ── LEFT PANEL ───────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative bg-[#0A1628] overflow-hidden flex-col">
        {/* Subtle decorative orbs */}
        <div className="absolute w-[500px] h-[500px] bg-[#00A86B] rounded-full blur-3xl opacity-[0.06] -top-40 -left-40 pointer-events-none" />
        <div className="absolute w-[400px] h-[400px] bg-[#006B47] rounded-full blur-3xl opacity-[0.05] bottom-0 right-0 pointer-events-none" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Logo variant="horizontal-dark" size="md" />
          </motion.div>

          {/* Main copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-auto mb-8"
          >
            <div className="inline-flex items-center gap-2 bg-[#00A86B]/15 border border-[#00A86B]/25 rounded-full px-3 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 bg-[#00A86B] rounded-full animate-pulse" />
              <span className="text-[#00A86B] text-xs font-semibold tracking-wide">Conforme aux normes marocaines</span>
            </div>

            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              La prescription médicale<br />
              <span className="text-[#00A86B]">
                sécurisée.
              </span>
            </h2>
            <p className="text-white/50 text-base leading-relaxed max-w-md">
              Gérez vos patients, vérifiez les interactions médicamenteuses et rédigez vos ordonnances en toute sécurité.
            </p>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="space-y-4 mb-10"
          >
            <Feature icon={Shield}      title="Vérificateur d'interactions" desc="Base DDInter + plus de 52 000 médicaments" />
            <Feature icon={Stethoscope} title="Assistant IA intégré"       desc="Aide à la prescription basée sur l'IA" />
            <Feature icon={Building2}   title="Multi-organisations"         desc="Cabinets individuels et cliniques" />
          </motion.div>
        </div>
      </div>

      {/* ── RIGHT PANEL ──────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#FAFAF7]">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <Logo variant="horizontal-light" size="md" />
          </div>

          {/* Card */}
          <div className="bg-white border border-[#E5E5E0] rounded-lg p-8 shadow-sm">
            {/* Heading */}
            <div className="mb-7">
              <h2 className="text-[28px] font-bold text-[#0A1628] mb-1 tracking-tight">Bienvenue.</h2>
              <p className="text-[#475569] text-sm">Accédez à votre espace médical</p>
            </div>

            {/* Email verification */}
            {showEmailVerification && unverifiedEmail && (
              <div className="mb-6">
                <EmailVerificationPrompt
                  email={unverifiedEmail}
                  onClose={() => { setShowEmailVerification(false); setUnverifiedEmail(''); }}
                />
              </div>
            )}

            {/* Success message */}
            <AnimatePresence>
              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mb-5 flex items-start gap-3 p-4 bg-[#E6F4EE] border border-[#00A86B]/20 rounded-md"
                >
                  <CheckCircle className="w-5 h-5 text-[#00A86B] flex-shrink-0 mt-0.5" />
                  <span className="text-[#006B47] text-sm">{successMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mb-5 flex items-start gap-3 p-4 bg-[#FEF2F2] border border-[#DC2626]/20 rounded-md"
                >
                  <AlertCircle className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
                  <span className="text-[#DC2626] text-sm">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email field */}
              <div>
                <label className="block text-[13px] font-semibold text-[#0A1628] mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                    placeholder="votre@email.com"
                    className="w-full h-10 pl-10 pr-4 bg-white border border-[#E5E5E0] rounded-md text-[#0A1628] placeholder-[#94A3B8] text-sm focus:outline-none focus:ring-2 focus:ring-[#00A86B]/30 focus:border-[#00A86B] transition-all"
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label className="block text-[13px] font-semibold text-[#0A1628] mb-1.5">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full h-10 pl-10 pr-11 bg-white border border-[#E5E5E0] rounded-md text-[#0A1628] placeholder-[#94A3B8] text-sm focus:outline-none focus:ring-2 focus:ring-[#00A86B]/30 focus:border-[#00A86B] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#94A3B8] hover:text-[#475569] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember + forgot */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-[#E5E5E0] accent-[#00A86B]"
                  />
                  <span className="text-sm text-[#475569]">Se souvenir de moi</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-[#475569] hover:text-[#00A86B] transition-colors"
                >
                  Mot de passe oublié ?
                </button>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileTap={{ scale: 0.98 }}
                className="w-full h-10 flex items-center justify-center gap-2.5 px-6 bg-[#00A86B] hover:bg-[#006B47] text-white font-semibold rounded-md shadow-sm shadow-[#00A86B]/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connexion en cours...</span>
                  </>
                ) : (
                  <>
                    <span>Se connecter</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-[#E5E5E0]" />
              <span className="text-xs text-[#94A3B8] font-medium">ou</span>
              <div className="flex-1 h-px bg-[#E5E5E0]" />
            </div>

            {/* Register */}
            <div className="text-center">
              <p className="text-sm text-[#475569]">
                Pas encore de compte ?{' '}
                <button
                  onClick={() => navigate('/register')}
                  className="font-bold text-[#00A86B] hover:text-[#006B47] transition-colors"
                >
                  Essai gratuit 14 jours →
                </button>
              </p>
            </div>
          </div>

          {/* Trust badge */}
          <div className="mt-5 flex items-center justify-center gap-2 text-[#94A3B8] text-xs">
            <Shield className="w-3.5 h-3.5" />
            <span>Données chiffrées · Conforme CNDP · Hébergement Maroc</span>
          </div>
        </motion.div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
}
