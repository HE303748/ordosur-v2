import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import {
  Activity, Lock, Eye, EyeOff, CheckCircle,
  AlertCircle, ArrowRight, Loader2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvitationData {
  id: string;
  org_id: string;
  email: string;
  prenom: string | null;
  nom: string | null;
  specialite: string | null;
  token: string;
  expires_at: string;
  clinic_name: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function passwordStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const map = [
    { score: 1, label: 'Trop faible',  color: 'bg-red-500'    },
    { score: 2, label: 'Faible',        color: 'bg-orange-400' },
    { score: 3, label: 'Moyen',         color: 'bg-yellow-400' },
    { score: 4, label: 'Fort',          color: 'bg-emerald-500'},
  ];
  return map[score - 1] ?? { score: 0, label: '', color: '' };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-[#0A0F1E] to-slate-900">
      <Loader2 className="w-8 h-8 text-[#00A86B] animate-spin" />
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-[#0A0F1E] to-slate-900 p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#111827] border border-white/[0.08] rounded-2xl p-8 w-full max-w-md text-center shadow-2xl"
      >
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Lien invalide ou expiré</h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">{message}</p>
        <button
          onClick={() => navigate('/')}
          className="w-full py-3 bg-[#00A86B] hover:bg-[#006B47] text-white rounded-xl text-sm font-semibold transition-colors"
        >
          Retour à la connexion
        </button>
      </motion.div>
    </div>
  );
}

function SuccessScreen({ clinicName, prenom }: { clinicName: string; prenom: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-[#0A0F1E] to-slate-900 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#111827] border border-white/[0.08] rounded-2xl p-8 w-full max-w-md text-center shadow-2xl"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 260 }}
          className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5"
        >
          <CheckCircle className="w-10 h-10 text-emerald-400" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-2">Compte créé !</h2>
        <p className="text-slate-400 mb-1">
          Bienvenue{prenom ? `, Dr. ${prenom}` : ''} dans l'équipe de
        </p>
        <p className="text-[#00A86B] font-semibold mb-5">{clinicName}</p>
        <div className="p-4 bg-[#00A86B]/10 border border-[#00A86B]/20 rounded-xl mb-6">
          <p className="text-sm text-[#00A86B] leading-relaxed">
            Un email de confirmation vous a été envoyé. Cliquez sur le lien pour activer votre compte et accéder à votre espace médecin.
          </p>
        </div>
        <p className="text-xs text-slate-600">Vous pouvez fermer cette page.</p>
      </motion.div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AcceptInvitationPage() {
  const navigate     = useNavigate();
  const [searchParams] = useSearchParams();
  const token        = searchParams.get('token');
  const invType      = searchParams.get('type'); // 'secretaire' | null (doctor default)

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [errMsg, setErrMsg]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone]             = useState(false);

  const [pwd, setPwd]   = useState('');
  const [pwd2, setPwd2] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  // Editable prenom/nom (pre-filled from invitation)
  const [prenom, setPrenom] = useState('');
  const [nom,    setNom]    = useState('');

  useEffect(() => {
    if (!token) {
      setErrMsg("Lien d'invitation manquant. Vérifiez votre email.");
      setLoading(false);
      return;
    }
    validateToken(token);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function validateToken(t: string) {
    setLoading(true);
    try {
      // Choose table based on invitation type
      const tableName = invType === 'secretaire' ? 'secretaire_invitations' : 'clinic_invitations';
      const selectFields = invType === 'secretaire'
        ? 'id, org_id, email, prenom, nom, token, expires_at, statut'
        : 'id, org_id, email, prenom, nom, specialite, token, expires_at, statut';

      const { data: inv, error: invErr } = await supabase
        .from(tableName)
        .select(selectFields)
        .eq('token', t)
        .maybeSingle();

      if (invErr) throw invErr;

      if (!inv) {
        setErrMsg("Ce lien d'invitation est invalide. Il a peut-être déjà été utilisé ou n'existe pas.");
        setLoading(false);
        return;
      }

      if (inv.statut !== 'pending') {
        setErrMsg("Cette invitation a déjà été acceptée ou annulée.");
        setLoading(false);
        return;
      }

      if (new Date(inv.expires_at) < new Date()) {
        setErrMsg("Ce lien d'invitation a expiré. Contactez le médecin pour en recevoir un nouveau.");
        setLoading(false);
        return;
      }

      // Fetch org name
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', inv.org_id)
        .maybeSingle();

      setInvitation({
        ...inv,
        specialite: inv.specialite ?? null,
        clinic_name: org?.name ?? 'Cabinet',
      });

      setPrenom(inv.prenom ?? '');
      setNom(inv.nom ?? '');
    } catch (err) {
      console.error('[AcceptInvitation] validateToken error:', err);
      setErrMsg("Erreur lors de la validation du lien. Réessayez ou contactez l'administrateur.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');

    if (!prenom.trim()) { setSubmitError('Le prénom est requis.');  return; }
    if (!nom.trim())    { setSubmitError('Le nom est requis.');      return; }
    if (pwd.length < 8) { setSubmitError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    if (pwd !== pwd2)   { setSubmitError('Les mots de passe ne correspondent pas.'); return; }

    const str = passwordStrength(pwd);
    if (str.score < 2) {
      setSubmitError('Mot de passe trop faible. Ajoutez des majuscules, chiffres ou caractères spéciaux.');
      return;
    }

    if (!invitation) return;
    setSubmitting(true);

    try {
      const isSecretaire = invType === 'secretaire';

      // 1. Create auth user
      const { data: authData, error: signUpErr } = await supabase.auth.signUp({
        email:    invitation.email,
        password: pwd,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { role: isSecretaire ? 'secretaire' : 'doctor' },
        },
      });

      if (signUpErr) {
        if (signUpErr.message.includes('already registered') || signUpErr.message.includes('already been registered')) {
          setSubmitError('Un compte existe déjà avec cette adresse email. Connectez-vous directement.');
        } else {
          setSubmitError(signUpErr.message);
        }
        setSubmitting(false);
        return;
      }

      if (!authData.user) throw new Error('Échec création compte auth.');

      // 2. Accept invitation via the appropriate SECURITY DEFINER RPC
      const rpcName = isSecretaire ? 'accept_secretaire_invitation' : 'accept_clinic_invitation';
      const rpcArgs = isSecretaire
        ? { p_token: invitation.token, p_user_id: authData.user.id, p_prenom: prenom.trim(), p_nom: nom.trim() }
        : { p_token: invitation.token, p_user_id: authData.user.id };

      const { error: rpcErr } = await supabase.rpc(rpcName, rpcArgs);

      if (rpcErr) {
        console.error('[AcceptInvitation] RPC error:', rpcErr);
        if (!rpcErr.message.includes('duplicate') && !rpcErr.message.includes('unique')) {
          throw rpcErr;
        }
      }

      setDone(true);
    } catch (err: unknown) {
      console.error('[AcceptInvitation] submit error:', err);
      setSubmitError(err instanceof Error ? err.message : 'Erreur inattendue. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render states
  if (loading)                    return <LoadingScreen />;
  if (errMsg && !invitation)      return <ErrorScreen message={errMsg} />;
  if (done && invitation)         return <SuccessScreen clinicName={invitation.clinic_name} prenom={prenom} />;

  if (!invitation) return <ErrorScreen message="Invitation introuvable." />;

  const str = passwordStrength(pwd);

  const inputCls = "w-full px-4 py-3 bg-[#1E293B] border border-white/[0.1] rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 placeholder-slate-600";
  const labelCls = "block text-xs font-semibold text-slate-400 mb-1.5";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-[#0A0F1E] to-slate-900 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Card */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">

          {/* Top banner */}
          <div className="bg-gradient-to-r [#00A86B] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg leading-tight">OrdoSur</h1>
                <p className="text-white/80 text-xs">Invitation à rejoindre</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-white/80 text-sm">Vous avez été invité(e) à rejoindre</p>
              <p className="text-white font-bold text-xl mt-0.5">{invitation.clinic_name}</p>
              {invitation.specialite && (
                <span className="inline-block mt-2 px-2.5 py-1 bg-white/20 rounded-full text-xs text-white font-medium">
                  {invitation.specialite}
                </span>
              )}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <p className="text-sm font-semibold text-white mb-4">
                {invType === 'secretaire' ? 'Créez votre compte secrétaire' : 'Créez votre compte médecin'}
              </p>
            </div>

            {/* Email (locked) */}
            <div>
              <label className={labelCls}>Adresse email</label>
              <input
                type="email"
                value={invitation.email}
                disabled
                className={`${inputCls} opacity-60 cursor-not-allowed`}
              />
              <p className="text-[11px] text-slate-600 mt-1">Pré-rempli depuis votre invitation</p>
            </div>

            {/* Prenom + Nom */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Prénom <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={prenom}
                  onChange={e => setPrenom(e.target.value)}
                  placeholder="Mohamed"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Nom <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  placeholder="Benali"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className={labelCls}>Mot de passe <span className="text-red-400">*</span></label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={pwd}
                  onChange={e => setPwd(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Strength bar */}
              <AnimatePresence>
                {pwd && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 space-y-1.5"
                  >
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                            i <= str.score ? str.color : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                    {str.label && (
                      <p className="text-[11px] text-slate-500">{str.label}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Confirm password */}
            <div>
              <label className={labelCls}>Confirmer le mot de passe <span className="text-red-400">*</span></label>
              <div className="relative">
                <input
                  type={showPwd2 ? 'text' : 'password'}
                  value={pwd2}
                  onChange={e => setPwd2(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputCls} pr-10 ${
                    pwd2 && pwd !== pwd2 ? 'border-red-500/50 focus:ring-red-500/30' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd2(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPwd2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {pwd2 && pwd !== pwd2 && (
                <p className="text-[11px] text-red-400 mt-1">Les mots de passe ne correspondent pas</p>
              )}
            </div>

            {/* Submit error */}
            <AnimatePresence>
              {submitError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl"
                >
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300 leading-relaxed">{submitError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-gradient-to-r bg-[#00A86B] hover:bg-[#006B47] disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-[#00A86B]/20 flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Créer mon compte
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-center text-xs text-slate-600 pt-1">
              Déjà un compte ?{' '}
              <button type="button" onClick={() => navigate('/')} className="text-[#00A86B] hover:text-[#00A86B] font-medium transition-colors">
                Se connecter
              </button>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
