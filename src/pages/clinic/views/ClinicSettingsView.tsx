import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Lock, Shield, Building2, User, Check, Eye, EyeOff } from 'lucide-react';
import { PageTransition } from '../../../components/ui/PageTransition';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

// ─── Input ────────────────────────────────────────────────────────────────────

const inputCls = `
  w-full px-4 py-2.5 bg-white dark:bg-[#1E293B]
  border border-slate-200 dark:border-white/[0.1]
  rounded-xl text-sm text-slate-900 dark:text-[#E2E8F0]
  placeholder-slate-400 dark:placeholder-slate-600
  focus:outline-none focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-500/40
  transition-all
`.replace(/\s+/g, ' ').trim();

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700 dark:text-[#94A3B8]">{label}</label>
      {children}
    </div>
  );
}

// ─── Toast inline ─────────────────────────────────────────────────────────────

function InlineSuccess({ msg }: { msg: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="flex items-center gap-2 px-4 py-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-400 text-sm font-medium"
    >
      <Check className="w-4 h-4" />
      {msg}
    </motion.div>
  );
}

function InlineError({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm">
      {msg}
    </div>
  );
}

// ─── Tab types ────────────────────────────────────────────────────────────────

type TabType = 'clinique' | 'profil' | 'securite';

// ─── Component ────────────────────────────────────────────────────────────────

export function ClinicSettingsView() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('clinique');

  // ── Org data ──
  const [orgName,      setOrgName]      = useState('');
  const [orgAdresse,   setOrgAdresse]   = useState('');
  const [orgTelephone, setOrgTelephone] = useState('');
  const [orgEmail,     setOrgEmail]     = useState('');
  const [orgSaving,    setOrgSaving]    = useState(false);
  const [orgMsg,       setOrgMsg]       = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Profile data ──
  const [prenom,       setPrenom]       = useState('');
  const [nom,          setNom]          = useState('');
  const [profSaving,   setProfSaving]   = useState(false);
  const [profMsg,      setProfMsg]      = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Password ──
  const [pwd,          setPwd]          = useState('');
  const [pwdConfirm,   setPwdConfirm]   = useState('');
  const [showPwd,      setShowPwd]      = useState(false);
  const [pwdSaving,    setPwdSaving]    = useState(false);
  const [pwdMsg,       setPwdMsg]       = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load data
  useEffect(() => {
    if (!user?.org_id) return;
    supabase.from('organizations').select('name, adresse, telephone, email').eq('id', user.org_id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setOrgName(data.name ?? '');
          setOrgAdresse(data.adresse ?? '');
          setOrgTelephone(data.telephone ?? '');
          setOrgEmail(data.email ?? '');
        }
      });
    setPrenom(user.prenom ?? '');
    setNom(user.nom ?? '');
  }, [user]);

  // ── Save org ──
  async function saveOrg() {
    if (!user?.org_id) return;
    setOrgSaving(true); setOrgMsg(null);
    const { error } = await supabase
      .from('organizations')
      .update({ name: orgName.trim(), adresse: orgAdresse.trim(), telephone: orgTelephone.trim(), email: orgEmail.trim() })
      .eq('id', user.org_id);
    setOrgSaving(false);
    setOrgMsg(error
      ? { type: 'error', text: 'Erreur lors de la sauvegarde.' }
      : { type: 'success', text: 'Informations mises à jour.' }
    );
    setTimeout(() => setOrgMsg(null), 4000);
  }

  // ── Save profile ──
  async function saveProfile() {
    if (!user?.id) return;
    setProfSaving(true); setProfMsg(null);
    const { error } = await supabase
      .from('user_profiles')
      .update({ prenom: prenom.trim(), nom: nom.trim() })
      .eq('user_id', user.id);
    setProfSaving(false);
    setProfMsg(error
      ? { type: 'error', text: 'Erreur lors de la mise à jour.' }
      : { type: 'success', text: 'Profil mis à jour.' }
    );
    setTimeout(() => setProfMsg(null), 4000);
  }

  // ── Change password ──
  async function changePassword() {
    if (pwd.length < 8) { setPwdMsg({ type: 'error', text: 'Minimum 8 caractères.' }); return; }
    if (pwd !== pwdConfirm) { setPwdMsg({ type: 'error', text: 'Les mots de passe ne correspondent pas.' }); return; }
    setPwdSaving(true); setPwdMsg(null);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setPwdSaving(false);
    if (error) {
      setPwdMsg({ type: 'error', text: error.message });
    } else {
      setPwdMsg({ type: 'success', text: 'Mot de passe modifié avec succès.' });
      setPwd(''); setPwdConfirm('');
    }
    setTimeout(() => setPwdMsg(null), 4000);
  }

  // ── Download report ──
  function downloadReport() {
    const content = [
      `Rapport d'activité OrdoSur — ${new Date().toLocaleDateString('fr-FR')}`,
      `Organisation : ${orgName}`,
      `Adresse : ${orgAdresse}`,
      `Email : ${orgEmail}`,
      `Téléphone : ${orgTelephone}`,
      '',
      'Rapport généré automatiquement par OrdoSur.',
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `rapport_activite_${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  }

  const TABS: { key: TabType; label: string; icon: any }[] = [
    { key: 'clinique',  label: 'Informations clinique', icon: Building2 },
    { key: 'profil',    label: 'Mon profil admin',      icon: User      },
    { key: 'securite',  label: 'Sécurité',              icon: Shield    },
  ];

  const cardCls = 'bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-6 shadow-sm space-y-5';

  return (
    <PageTransition>
      <div className="p-6 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#E2E8F0]">Paramètres</h1>
          <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-0.5">Gérez votre clinique et votre compte</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-100/80 dark:bg-white/[0.04] p-1 rounded-xl w-fit">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === t.key
                    ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#E2E8F0] shadow-sm'
                    : 'text-slate-500 dark:text-[#94A3B8] hover:text-slate-700 dark:hover:text-[#E2E8F0]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ── Tab: Clinique ── */}
        {activeTab === 'clinique' && (
          <motion.div key="clinique" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cardCls}>
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 dark:text-[#E2E8F0] text-sm">Informations de la clinique</h2>
                <p className="text-xs text-slate-400 dark:text-[#475569]">Modifiez les informations affichées</p>
              </div>
            </div>

            {orgMsg && (orgMsg.type === 'success' ? <InlineSuccess msg={orgMsg.text} /> : <InlineError msg={orgMsg.text} />)}

            <Field label="Nom de la clinique">
              <input value={orgName} onChange={e => setOrgName(e.target.value)} className={inputCls} placeholder="Clinique Al Amal" />
            </Field>
            <Field label="Adresse">
              <input value={orgAdresse} onChange={e => setOrgAdresse(e.target.value)} className={inputCls} placeholder="45 Avenue Hassan II, Rabat" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Téléphone">
                <input value={orgTelephone} onChange={e => setOrgTelephone(e.target.value)} className={inputCls} placeholder="+212 6XX XXX XXX" />
              </Field>
              <Field label="Email">
                <input value={orgEmail} onChange={e => setOrgEmail(e.target.value)} type="email" className={inputCls} placeholder="contact@clinique.ma" />
              </Field>
            </div>

            <div className="pt-2">
              <button
                onClick={saveOrg}
                disabled={orgSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {orgSaving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Tab: Profil ── */}
        {activeTab === 'profil' && (
          <motion.div key="profil" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className={cardCls}>
              <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-white/[0.06]">
                <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-[#E2E8F0] text-sm">Mon profil</h2>
                  <p className="text-xs text-slate-400 dark:text-[#475569]">Informations personnelles</p>
                </div>
              </div>

              {profMsg && (profMsg.type === 'success' ? <InlineSuccess msg={profMsg.text} /> : <InlineError msg={profMsg.text} />)}

              <div className="grid grid-cols-2 gap-4">
                <Field label="Prénom">
                  <input value={prenom} onChange={e => setPrenom(e.target.value)} className={inputCls} placeholder="Fatima" />
                </Field>
                <Field label="Nom">
                  <input value={nom} onChange={e => setNom(e.target.value)} className={inputCls} placeholder="Alaoui" />
                </Field>
              </div>
              <Field label="Email (lecture seule)">
                <input value={user?.email ?? ''} readOnly className={`${inputCls} opacity-60 cursor-not-allowed`} />
              </Field>

              <div className="pt-2">
                <button
                  onClick={saveProfile}
                  disabled={profSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {profSaving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </div>

            {/* Change password */}
            <div className={cardCls}>
              <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-white/[0.06]">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-[#E2E8F0] text-sm">Changer le mot de passe</h2>
                </div>
              </div>

              {pwdMsg && (pwdMsg.type === 'success' ? <InlineSuccess msg={pwdMsg.text} /> : <InlineError msg={pwdMsg.text} />)}

              <Field label="Nouveau mot de passe">
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} value={pwd} onChange={e => setPwd(e.target.value)}
                    className={inputCls} placeholder="Minimum 8 caractères" />
                  <button onClick={() => setShowPwd(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>
              <Field label="Confirmer">
                <input type="password" value={pwdConfirm} onChange={e => setPwdConfirm(e.target.value)}
                  className={inputCls} placeholder="Répétez le mot de passe" />
              </Field>

              <div className="pt-2">
                <button
                  onClick={changePassword}
                  disabled={pwdSaving || !pwd}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
                >
                  <Lock className="w-4 h-4" />
                  {pwdSaving ? 'Modification…' : 'Modifier le mot de passe'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Tab: Sécurité ── */}
        {activeTab === 'securite' && (
          <motion.div key="securite" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className={cardCls}>
              <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-white/[0.06]">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="font-bold text-slate-900 dark:text-[#E2E8F0] text-sm">Sessions actives</h2>
              </div>
              <div className="flex items-center gap-3 p-3 bg-emerald-50/50 dark:bg-emerald-500/[0.07] border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-[#E2E8F0]">Session actuelle</p>
                  <p className="text-xs text-slate-500 dark:text-[#475569]">Connecté depuis ce navigateur</p>
                </div>
                <span className="ml-auto text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Active</span>
              </div>
            </div>

            <div className={cardCls}>
              <h2 className="font-bold text-slate-900 dark:text-[#E2E8F0] text-sm pb-2 border-b border-slate-100 dark:border-white/[0.06]">
                Historique des connexions
              </h2>
              <div className="flex flex-col items-center py-8 text-center">
                <Shield className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-sm font-medium text-slate-400 dark:text-slate-600">Fonctionnalité à venir</p>
                <p className="text-xs text-slate-300 dark:text-slate-700 mt-1">
                  L'historique des connexions sera disponible prochainement
                </p>
              </div>
            </div>

            <div className={cardCls}>
              <h2 className="font-bold text-slate-900 dark:text-[#E2E8F0] text-sm pb-2 border-b border-slate-100 dark:border-white/[0.06]">
                Rapport d'activité
              </h2>
              <p className="text-sm text-slate-500 dark:text-[#94A3B8]">
                Téléchargez un résumé de l'activité de votre clinique.
              </p>
              <button
                onClick={downloadReport}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 dark:bg-white/[0.08] hover:bg-slate-700 dark:hover:bg-white/[0.12] text-white dark:text-[#E2E8F0] text-sm font-semibold rounded-xl transition-colors"
              >
                <Save className="w-4 h-4" />
                Télécharger rapport
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}
