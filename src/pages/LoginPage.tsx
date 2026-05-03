import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity, Shield, Stethoscope, Building2, Eye, EyeOff,
  Loader2, AlertCircle, CheckCircle, ArrowRight, Lock, Mail,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { validateEmail } from '../lib/validation';
import { EmailVerificationPrompt } from '../components/EmailVerificationPrompt';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';

/* ── Floating orb decorations ── */
function Orb({ className }: { className: string }) {
  return <div className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${className}`} />;
}

/* ── Feature row ── */
function Feature({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-white/[0.1] border border-white/[0.15] flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-sky-300" />
      </div>
      <div>
        <p className="text-white font-semibold text-sm">{title}</p>
        <p className="text-white/55 text-sm mt-0.5">{desc}</p>
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
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
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
    <div className="min-h-screen bg-slate-50 flex">
      {/* ── LEFT PANEL ───────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative bg-[#0A1628] overflow-hidden flex-col">
        {/* Background decoration */}
        <Orb className="w-[500px] h-[500px] bg-sky-500 -top-40 -left-40" />
        <Orb className="w-[400px] h-[400px] bg-cyan-500 bottom-0 right-0" />
        <Orb className="w-[200px] h-[200px] bg-blue-600 top-1/2 left-1/3" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
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
            className="flex items-center gap-3"
          >
            <div className="w-11 h-11 bg-gradient-to-br from-sky-400 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/30">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-2xl tracking-tight leading-none">OrdoSur</h1>
              <p className="text-sky-400/70 text-xs font-medium mt-0.5">Plateforme médicale</p>
            </div>
          </motion.div>

          {/* Main copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-auto mb-8"
          >
            <div className="inline-flex items-center gap-2 bg-sky-500/15 border border-sky-500/25 rounded-full px-3 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-sky-300 text-xs font-semibold tracking-wide">Conforme aux normes marocaines</span>
            </div>

            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              La prescription médicale<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400">
                réinventée
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
            <Feature icon={Shield} title="Vérificateur d'interactions" desc="Base DDInter + plus de 52 000 médicaments" />
            <Feature icon={Stethoscope} title="Assistant IA intégré" desc="Aide à la prescription basée sur l'IA" />
            <Feature icon={Building2} title="Multi-organisations" desc="Cabinets individuels et cliniques" />
          </motion.div>

        </div>
      </div>

      {/* ── RIGHT PANEL ──────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-cyan-400 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-slate-900 font-bold text-xl">OrdoSur</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Connexion</h2>
            <p className="text-slate-500 text-sm">Accédez à votre espace médical</p>
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
                className="mb-5 flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl"
              >
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="text-emerald-700 text-sm">{successMessage}</span>
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
                className="mb-5 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl"
              >
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-red-600 text-sm">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email field */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  placeholder="votre@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
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
                  className="w-4 h-4 rounded border-slate-300 text-sky-500 focus:ring-sky-500 accent-sky-500"
                />
                <span className="text-sm text-slate-600">Se souvenir de moi</span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm font-semibold text-sky-600 hover:text-sky-700 transition-colors"
              >
                Mot de passe oublié ?
              </button>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm mt-2"
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
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400 font-medium">ou</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Register */}
          <div className="text-center">
            <p className="text-sm text-slate-500">
              Pas encore de compte ?{' '}
              <button
                onClick={() => navigate('/register')}
                className="font-semibold text-sky-600 hover:text-sky-700 transition-colors"
              >
                S'inscrire gratuitement
              </button>
            </p>
          </div>

          {/* Trust badge */}
          <div className="mt-8 flex items-center justify-center gap-2 text-slate-400 text-xs">
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
