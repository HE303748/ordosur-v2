import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, Lock, Shield, Building2, User, Check, Eye, EyeOff,
  Bell, Upload, X, Camera, Clock, Plus, Minus, Download,
  MonitorSmartphone, AlertTriangle, LogOut, FileJson, Bot,
} from 'lucide-react';
import { PageTransition } from '../../../components/ui/PageTransition';
import { Toggle } from '../../../components/ui/Toggle';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-4 py-2.5 bg-white dark:bg-[#1E293B] ' +
  'border border-slate-200 dark:border-white/[0.1] ' +
  'rounded-xl text-sm text-slate-900 dark:text-[#E2E8F0] ' +
  'placeholder-slate-400 dark:placeholder-slate-600 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 dark:focus:ring-[#00A86B]/40 transition-all';

const cardCls =
  'bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] ' +
  'rounded-2xl p-6 shadow-sm space-y-5';

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700 dark:text-[#94A3B8]">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 dark:text-[#475569]">{hint}</p>}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, sub, color }: {
  icon: React.ElementType; title: string; sub?: string;
  color: 'sky' | 'violet' | 'amber' | 'emerald' | 'red';
}) {
  const colorMap = {
    sky:     'bg-[#E6F4EE] dark:bg-[#00A86B]/10 text-[#00A86B]',
    violet:  'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400',
    amber:   'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    red:     'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
  };
  return (
    <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h2 className="font-bold text-slate-900 dark:text-[#E2E8F0] text-sm">{title}</h2>
        {sub && <p className="text-xs text-slate-400 dark:text-[#475569]">{sub}</p>}
      </div>
    </div>
  );
}

function StatusMsg({ msg }: { msg: { type: 'success' | 'error'; text: string } | null }) {
  if (!msg) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
        msg.type === 'success'
          ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
          : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400'
      }`}
    >
      {msg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      {msg.text}
    </motion.div>
  );
}

function SaveBtn({ saving, label = 'Enregistrer', color = 'sky', onClick, disabled }: {
  saving: boolean; label?: string; color?: 'sky' | 'amber' | 'red';
  onClick?: () => void; disabled?: boolean;
}) {
  const colors = {
    sky:   'bg-[#00A86B] hover:bg-[#006B47]',
    amber: 'bg-amber-500 hover:bg-amber-600',
    red:   'bg-red-500 hover:bg-red-600',
  };
  return (
    <button
      onClick={onClick}
      disabled={saving || disabled}
      className={`flex items-center gap-2 px-5 py-2.5 ${colors[color]} text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60`}
    >
      {saving
        ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        : <Save className="w-4 h-4" />}
      {saving ? 'Enregistrement…' : label}
    </button>
  );
}

// Notification row — label on left, toggle on right
function NotifToggleRow({ checked, onChange, label, sub }: {
  checked: boolean; onChange: (v: boolean) => void;
  label: string; sub?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-50 dark:border-white/[0.04] last:border-0">
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-[#E2E8F0]">{label}</p>
        {sub && <p className="text-xs text-slate-400 dark:text-[#475569] mt-0.5">{sub}</p>}
      </div>
      <Toggle enabled={checked} onChange={onChange} />
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SPECIALITES_OPTIONS = [
  'Cardiologie', 'Dermatologie', 'Pédiatrie', 'Gynécologie',
  'ORL', 'Neurologie', 'Psychiatrie', 'Médecine générale',
  'Ophtalmologie', 'Orthopédie', 'Rhumatologie', 'Oncologie',
];

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

interface HoraireJour {
  ouvert: boolean;
  debut: string;
  fin: string;
}

type TabType = 'clinique' | 'profil' | 'notifications' | 'securite' | 'ia';

interface NotifPrefs {
  invitationAcceptee: boolean;
  interactionDangereuse: boolean;
  rapportMensuel: boolean;
  patientCritique: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ClinicSettingsView() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('clinique');

  // ── Org data ──────────────────────────────────────────────────────────────
  const [orgName,       setOrgName]       = useState('');
  const [orgAdresse,    setOrgAdresse]    = useState('');
  const [orgTelephone,  setOrgTelephone]  = useState('');
  const [orgEmail,      setOrgEmail]      = useState('');
  const [logoUrl,       setLogoUrl]       = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [specialites,   setSpecialites]   = useState<string[]>([]);
  const [horaires,      setHoraires]      = useState<Record<string, HoraireJour>>(() =>
    Object.fromEntries(JOURS.map(j => [j, { ouvert: j !== 'Dimanche', debut: '08:00', fin: '18:00' }]))
  );
  const [orgSaving,     setOrgSaving]     = useState(false);
  const [orgMsg,        setOrgMsg]        = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // ── Profile data ──────────────────────────────────────────────────────────
  const [prenom,        setPrenom]        = useState('');
  const [nom,           setNom]           = useState('');
  const [profPhone,     setProfPhone]     = useState('');
  const [avatarUrl,     setAvatarUrl]     = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profSaving,    setProfSaving]    = useState(false);
  const [profMsg,       setProfMsg]       = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // ── Password ──────────────────────────────────────────────────────────────
  const [showPwdModal, setShowPwdModal]   = useState(false);
  const [pwd,           setPwd]           = useState('');
  const [pwdConfirm,    setPwdConfirm]    = useState('');
  const [showPwd,       setShowPwd]       = useState(false);
  const [pwdSaving,     setPwdSaving]     = useState(false);
  const [pwdMsg,        setPwdMsg]        = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Notifications ─────────────────────────────────────────────────────────
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    invitationAcceptee:   true,
    interactionDangereuse: true,
    rapportMensuel:       false,
    patientCritique:      true,
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifMsg,    setNotifMsg]    = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Security ──────────────────────────────────────────────────────────────
  const [exportLoading, setExportLoading] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);

  // ── Session history ────────────────────────────────────────────────────────
  interface SessionRow { id: string; user_agent: string; created_at: string; }
  const [sessionHistory, setSessionHistory] = useState<SessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // ── IA ────────────────────────────────────────────────────────────────────
  const [iaApiKey, setIaApiKey]     = useState(() => {
    try { return localStorage.getItem('ordosur_anthropic_key') || ''; } catch { return ''; }
  });
  const [iaMsg, setIaMsg]           = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [iaTesting, setIaTesting]   = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    // Load org
    if (user.org_id) {
      supabase.from('organizations')
        .select('name, adresse, telephone, email')
        .eq('id', user.org_id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setOrgName(data.name ?? '');
            setOrgAdresse(data.adresse ?? '');
            setOrgTelephone(data.telephone ?? '');
            setOrgEmail(data.email ?? '');
          }
        });
    }

    // Load profile
    setPrenom(user.prenom ?? '');
    setNom(user.nom ?? '');

    // Load preferences from user_profiles
    supabase.from('user_profiles')
      .select('preferences')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.preferences) {
          try {
            const prefs = typeof data.preferences === 'string'
              ? JSON.parse(data.preferences)
              : data.preferences;
            if (prefs.notifications) setNotifPrefs(p => ({ ...p, ...prefs.notifications }));
          } catch {}
        }
      });
  }, [user]);

  // ── Load session history when security tab becomes active ──────────────────
  useEffect(() => {
    if (activeTab !== 'securite' || !user?.id) return;
    setSessionsLoading(true);
    supabase
      .from('user_sessions')
      .select('id, user_agent, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setSessionHistory(data ?? []);
        setSessionsLoading(false);
      });
  }, [activeTab, user?.id]);

  // ── Logo upload ────────────────────────────────────────────────────────────
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user?.org_id) return;
    setLogoUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'png';
      const path = `${user.org_id}/logo.${ext}`;
      const { error } = await supabase.storage
        .from('clinic-logos')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('clinic-logos').getPublicUrl(path);
      setLogoUrl(urlData.publicUrl);
      setOrgMsg({ type: 'success', text: 'Logo uploadé avec succès.' });
      setTimeout(() => setOrgMsg(null), 3000);
    } catch (err: any) {
      setOrgMsg({ type: 'error', text: `Erreur upload: ${err.message ?? 'inconnu'}` });
    } finally {
      setLogoUploading(false);
    }
  }

  // ── Avatar upload ──────────────────────────────────────────────────────────
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'png';
      const path = `${user.id}/avatar.${ext}`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(urlData.publicUrl);
      setProfMsg({ type: 'success', text: 'Photo de profil mise à jour.' });
      setTimeout(() => setProfMsg(null), 3000);
    } catch (err: any) {
      setProfMsg({ type: 'error', text: `Erreur upload: ${err.message ?? 'inconnu'}` });
    } finally {
      setAvatarUploading(false);
    }
  }

  // ── Save org ───────────────────────────────────────────────────────────────
  async function saveOrg() {
    if (!user?.org_id) return;
    setOrgSaving(true); setOrgMsg(null);
    const { error } = await supabase.from('organizations').update({
      name:      orgName.trim(),
      adresse:   orgAdresse.trim(),
      telephone: orgTelephone.trim(),
      email:     orgEmail.trim(),
    }).eq('id', user.org_id);
    setOrgSaving(false);
    setOrgMsg(error
      ? { type: 'error', text: 'Erreur lors de la sauvegarde.' }
      : { type: 'success', text: 'Informations mises à jour.' }
    );
    setTimeout(() => setOrgMsg(null), 4000);
  }

  // ── Save profile ───────────────────────────────────────────────────────────
  async function saveProfile() {
    if (!user?.id) return;
    setProfSaving(true); setProfMsg(null);
    const { error } = await supabase.from('user_profiles')
      .update({ prenom: prenom.trim(), nom: nom.trim() })
      .eq('user_id', user.id);
    setProfSaving(false);
    setProfMsg(error
      ? { type: 'error', text: 'Erreur lors de la mise à jour.' }
      : { type: 'success', text: 'Profil mis à jour.' }
    );
    setTimeout(() => setProfMsg(null), 4000);
  }

  // ── Change password ────────────────────────────────────────────────────────
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
      setTimeout(() => { setShowPwdModal(false); setPwdMsg(null); }, 2500);
    }
  }

  // ── Save notifications ─────────────────────────────────────────────────────
  async function saveNotifications() {
    if (!user?.id) return;
    setNotifSaving(true); setNotifMsg(null);
    const { error } = await supabase.from('user_profiles')
      .update({ preferences: { notifications: notifPrefs } } as Record<string, unknown>)
      .eq('user_id', user.id);
    setNotifSaving(false);
    setNotifMsg(error
      ? { type: 'error', text: 'Erreur lors de la sauvegarde.' }
      : { type: 'success', text: 'Préférences de notifications sauvegardées.' }
    );
    setTimeout(() => setNotifMsg(null), 4000);
  }

  // ── Export JSON ────────────────────────────────────────────────────────────
  async function exportData() {
    if (!user) return;
    setExportLoading(true);
    try {
      const [orgRes, profileRes, patientsRes] = await Promise.all([
        supabase.from('organizations').select('*').eq('id', user.org_id ?? '').maybeSingle(),
        supabase.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('patients').select('id, prenom, nom, created_at').eq('org_id', user.org_id ?? '').limit(100),
      ]);
      const exportObj = {
        generated_at: new Date().toISOString(),
        version:      '2.0',
        user: {
          id:     user.id,
          email:  user.email,
          prenom: user.prenom,
          nom:    user.nom,
        },
        organization:  orgRes.data,
        profile:       profileRes.data,
        patients_count: patientsRes.count ?? 0,
        patients_sample: patientsRes.data ?? [],
      };
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'), {
        href: url, download: `ordosur_export_${new Date().toISOString().slice(0, 10)}.json`,
      });
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportLoading(false);
    }
  }

  // ── Disconnect all sessions ────────────────────────────────────────────────
  async function disconnectAll() {
    if (!confirm('Déconnecter toutes les sessions ? Vous serez redirigé vers la page de connexion.')) return;
    setSignOutLoading(true);
    await supabase.auth.signOut({ scope: 'global' });
    signOut?.();
  }

  // ── Tabs config ────────────────────────────────────────────────────────────
  const TABS: { key: TabType; label: string; icon: React.ElementType }[] = [
    { key: 'clinique',      label: 'Informations',   icon: Building2 },
    { key: 'profil',        label: 'Mon profil',      icon: User      },
    { key: 'notifications', label: 'Notifications',  icon: Bell      },
    { key: 'securite',      label: 'Sécurité',       icon: Shield    },
    { key: 'ia',            label: 'Assistant IA',   icon: Bot       },
  ];

  // ── Specialité toggle ──────────────────────────────────────────────────────
  function toggleSpecialite(s: string) {
    setSpecialites(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  }

  // ── Horaire change ─────────────────────────────────────────────────────────
  function updateHoraire(jour: string, field: keyof HoraireJour, value: string | boolean) {
    setHoraires(h => ({ ...h, [jour]: { ...h[jour], [field]: value } }));
  }

  const initials = `${(user?.prenom?.[0] ?? '').toUpperCase()}${(user?.nom?.[0] ?? '').toUpperCase()}` || 'CA';

  return (
    <PageTransition>
      <div className="p-6 max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#E2E8F0]">Paramètres</h1>
          <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-0.5">Gérez votre clinique et votre compte</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-100/80 dark:bg-white/[0.04] p-1 rounded-xl w-fit flex-wrap">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === t.key
                    ? 'bg-white dark:bg-[#1A2235] text-slate-900 dark:text-[#E2E8F0] shadow-sm'
                    : 'text-slate-500 dark:text-[#94A3B8] hover:text-slate-700 dark:hover:text-[#E2E8F0]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════════════════
            TAB 1 : INFORMATIONS CLINIQUE
        ══════════════════════════════════════════════════════════ */}
        {activeTab === 'clinique' && (
          <motion.div key="clinique" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-4">

            {/* Infos de base */}
            <div className={cardCls}>
              <SectionHeader icon={Building2} title="Informations de la clinique"
                sub="Ces informations apparaissent sur vos ordonnances" color="sky" />

              <StatusMsg msg={orgMsg} />

              {/* Logo */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/[0.07] flex items-center justify-center overflow-hidden border-2 border-slate-200 dark:border-white/[0.1]">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-7 h-7 text-slate-400 dark:text-slate-600" />
                    )}
                  </div>
                  {logoUploading && (
                    <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-[#94A3B8] mb-1">Logo de la clinique</p>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-white/[0.05] rounded-lg transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Changer le logo
                  </button>
                  <p className="text-[11px] text-slate-400 dark:text-[#475569] mt-1">PNG, JPG · max 2 Mo</p>
                </div>
              </div>

              <Field label="Nom de la clinique">
                <input value={orgName} onChange={e => setOrgName(e.target.value)} className={inputCls} placeholder="Clinique Al Amal" />
              </Field>
              <Field label="Adresse complète">
                <input value={orgAdresse} onChange={e => setOrgAdresse(e.target.value)} className={inputCls} placeholder="45 Avenue Hassan II, Rabat 10000" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Téléphone">
                  <input value={orgTelephone} onChange={e => setOrgTelephone(e.target.value)} className={inputCls} placeholder="+212 5XX XX XX XX" />
                </Field>
                <Field label="Email de contact">
                  <input value={orgEmail} onChange={e => setOrgEmail(e.target.value)} type="email" className={inputCls} placeholder="contact@clinique.ma" />
                </Field>
              </div>

              <div className="pt-2">
                <SaveBtn saving={orgSaving} onClick={saveOrg} />
              </div>
            </div>

            {/* Spécialités */}
            <div className={cardCls}>
              <SectionHeader icon={Plus} title="Spécialités proposées"
                sub="Sélectionnez les spécialités de votre clinique" color="violet" />

              <div className="flex flex-wrap gap-2">
                {SPECIALITES_OPTIONS.map(s => {
                  const active = specialites.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleSpecialite(s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                        active
                          ? 'bg-violet-500 text-white border-violet-500 shadow-sm'
                          : 'bg-white dark:bg-[#1E293B] text-slate-600 dark:text-[#94A3B8] border-slate-200 dark:border-white/[0.1] hover:border-violet-300'
                      }`}
                    >
                      {active && <Check className="w-3 h-3 inline mr-1" />}
                      {s}
                    </button>
                  );
                })}
              </div>
              {specialites.length > 0 && (
                <p className="text-xs text-violet-500 dark:text-violet-400 mt-1">
                  {specialites.length} spécialité{specialites.length > 1 ? 's' : ''} sélectionnée{specialites.length > 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Horaires */}
            <div className={cardCls}>
              <SectionHeader icon={Clock} title="Horaires d'ouverture"
                sub="Définissez les horaires par jour de la semaine" color="emerald" />

              <div className="space-y-2">
                {JOURS.map(jour => {
                  const isOpen = horaires[jour]?.ouvert ?? false;
                  return (
                    <div
                      key={jour}
                      className={`rounded-xl border transition-all ${
                        isOpen
                          ? 'bg-[#E6F4EE]/60 dark:bg-[#00A86B]/[0.06] border-[#00A86B]/20 dark:border-[#00A86B]/20'
                          : 'bg-slate-50/60 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.05]'
                      }`}
                    >
                      {/* Day row */}
                      <div className="flex items-center gap-3 px-4 py-3">
                        {/* Day name */}
                        <span className={`w-24 flex-shrink-0 text-sm font-semibold ${
                          isOpen ? 'text-slate-900 dark:text-[#E2E8F0]' : 'text-slate-400 dark:text-[#475569]'
                        }`}>
                          {jour}
                        </span>

                        {/* Premium toggle */}
                        <Toggle
                          enabled={isOpen}
                          onChange={v => updateHoraire(jour, 'ouvert', v)}
                        />

                        {/* Status label */}
                        <span className={`text-xs font-medium flex-1 ${
                          isOpen ? 'text-[#00A86B]' : 'text-slate-400 dark:text-[#475569]'
                        }`}>
                          {isOpen ? 'Ouvert' : 'Fermé'}
                        </span>
                      </div>

                      {/* Time pickers — only visible when open */}
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="flex items-center gap-3 px-4 pb-3">
                              <span className="text-xs text-slate-500 dark:text-[#475569] w-24 flex-shrink-0">
                                Horaires
                              </span>
                              <input
                                type="time"
                                value={horaires[jour]?.debut ?? '08:00'}
                                onChange={e => updateHoraire(jour, 'debut', e.target.value)}
                                className="px-3 py-1.5 bg-white dark:bg-[#1E293B] border border-[#00A86B]/20 dark:border-[#00A86B]/30 rounded-lg text-sm text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 dark:focus:ring-[#00A86B]/40 transition-all"
                              />
                              <Minus className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <input
                                type="time"
                                value={horaires[jour]?.fin ?? '18:00'}
                                onChange={e => updateHoraire(jour, 'fin', e.target.value)}
                                className="px-3 py-1.5 bg-white dark:bg-[#1E293B] border border-[#00A86B]/20 dark:border-[#00A86B]/30 rounded-lg text-sm text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 dark:focus:ring-[#00A86B]/40 transition-all"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 2 : MON PROFIL ADMIN
        ══════════════════════════════════════════════════════════ */}
        {activeTab === 'profil' && (
          <motion.div key="profil" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-4">

            {/* Photo + infos */}
            <div className={cardCls}>
              <SectionHeader icon={User} title="Mon profil admin" sub="Informations personnelles" color="violet" />

              <StatusMsg msg={profMsg} />

              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br bg-[#00A86B] flex items-center justify-center text-white text-xl font-bold overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {avatarUploading
                      ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Camera className="w-5 h-5 text-white" />}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-[#94A3B8] mb-1">Photo de profil</p>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-white/[0.05] rounded-lg transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Changer la photo
                  </button>
                </div>
              </div>

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
              <Field label="Téléphone">
                <input value={profPhone} onChange={e => setProfPhone(e.target.value)} className={inputCls} placeholder="+212 6XX XXX XXX" />
              </Field>

              <div className="flex items-center gap-3 pt-2">
                <SaveBtn saving={profSaving} onClick={saveProfile} />
                <button
                  onClick={() => { setShowPwdModal(true); setPwdMsg(null); setPwd(''); setPwdConfirm(''); }}
                  className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-[#94A3B8] text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  Changer mot de passe
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 3 : NOTIFICATIONS
        ══════════════════════════════════════════════════════════ */}
        {activeTab === 'notifications' && (
          <motion.div key="notifications" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className={cardCls}>
              <SectionHeader icon={Bell} title="Préférences de notifications"
                sub="Gérez quand et comment vous êtes notifié" color="amber" />

              <StatusMsg msg={notifMsg} />

              <div className="space-y-1">
                <NotifToggleRow
                  checked={notifPrefs.invitationAcceptee}
                  onChange={v => setNotifPrefs(p => ({ ...p, invitationAcceptee: v }))}
                  label="Invitation médecin acceptée"
                  sub="Notifier quand un médecin rejoint la clinique"
                />
                <NotifToggleRow
                  checked={notifPrefs.interactionDangereuse}
                  onChange={v => setNotifPrefs(p => ({ ...p, interactionDangereuse: v }))}
                  label="Interaction dangereuse détectée"
                  sub="Alerte immédiate pour chaque interaction médicamenteuse majeure"
                />
                <NotifToggleRow
                  checked={notifPrefs.rapportMensuel}
                  onChange={v => setNotifPrefs(p => ({ ...p, rapportMensuel: v }))}
                  label="Rapport mensuel automatique"
                  sub="Envoi par email le 1er de chaque mois"
                />
                <NotifToggleRow
                  checked={notifPrefs.patientCritique}
                  onChange={v => setNotifPrefs(p => ({ ...p, patientCritique: v }))}
                  label="Patient à risque critique"
                  sub="Alerte quand un patient atteint un score de risque > 75"
                />
              </div>

              <div className="pt-2">
                <SaveBtn saving={notifSaving} onClick={saveNotifications} label="Sauvegarder les préférences" />
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 4 : SÉCURITÉ
        ══════════════════════════════════════════════════════════ */}
        {activeTab === 'securite' && (
          <motion.div key="securite" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-4">

            {/* Session actuelle */}
            <div className={cardCls}>
              <SectionHeader icon={MonitorSmartphone} title="Session active"
                sub="Votre connexion actuelle" color="emerald" />

              <div className="flex items-center gap-4 p-4 bg-emerald-50/50 dark:bg-emerald-500/[0.07] border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                    <MonitorSmartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-[#111827]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">
                    Session actuelle — {navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Navigateur'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-[#475569] truncate mt-0.5">
                    {window.location.hostname} · {new Date().toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <span className="text-xs bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full font-semibold flex-shrink-0">
                  Active
                </span>
              </div>

              <button
                onClick={disconnectAll}
                disabled={signOutLoading}
                className="flex items-center gap-2 px-4 py-2.5 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-500/[0.08] transition-colors disabled:opacity-60"
              >
                {signOutLoading
                  ? <span className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                  : <LogOut className="w-4 h-4" />}
                Déconnecter toutes les sessions
              </button>
            </div>

            {/* Historique */}
            <div className={cardCls}>
              <SectionHeader icon={Clock} title="Historique des connexions"
                sub="10 dernières connexions" color="sky" />

              {sessionsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-14 bg-slate-100 dark:bg-white/[0.04] rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : sessionHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center mb-3">
                    <Clock className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-[#94A3B8] font-medium">Aucune connexion enregistrée</p>
                  <p className="text-xs text-slate-400 dark:text-[#475569] mt-1">L'historique sera disponible dès votre prochaine connexion</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sessionHistory.map((s, i) => {
                    const date = new Date(s.created_at);
                    const isToday = date.toDateString() === new Date().toDateString();
                    const dateLabel = isToday
                      ? "Aujourd'hui"
                      : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
                    const timeLabel = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

                    // Parse browser from user-agent
                    const ua = s.user_agent ?? '';
                    let browser = 'Navigateur';
                    if (ua.includes('Edg/')) browser = 'Edge';
                    else if (ua.includes('Chrome/') && !ua.includes('Chromium')) browser = 'Chrome';
                    else if (ua.includes('Firefox/')) browser = 'Firefox';
                    else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
                    let os = '';
                    if (ua.includes('Windows')) os = 'Windows';
                    else if (ua.includes('Mac')) os = 'macOS';
                    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
                    else if (ua.includes('Android')) os = 'Android';
                    else if (ua.includes('Linux')) os = 'Linux';
                    const uaLabel = [browser, os].filter(Boolean).join(' / ');

                    const isCurrent = i === 0 && isToday;

                    return (
                      <div key={s.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                        isCurrent
                          ? 'bg-[#E6F4EE] dark:bg-[#00A86B]/[0.07] border border-[#00A86B]/20 dark:border-[#00A86B]/20'
                          : 'bg-slate-50/60 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]'
                      }`}>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          isCurrent ? 'bg-[#00A86B] animate-pulse' : 'bg-slate-300 dark:bg-slate-600'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-[#E2E8F0]">{uaLabel}</p>
                          <p className="text-xs text-slate-400 dark:text-[#475569]">{dateLabel} à {timeLabel}</p>
                        </div>
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-[#00A86B] flex-shrink-0">Session actuelle</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Export données */}
            <div className={cardCls}>
              <SectionHeader icon={FileJson} title="Export de mes données"
                sub="Téléchargez toutes vos données au format JSON" color="amber" />

              <p className="text-sm text-slate-500 dark:text-[#94A3B8]">
                Exportez votre profil, les informations de votre clinique et un échantillon des données patients (sans données sensibles).
              </p>

              <button
                onClick={exportData}
                disabled={exportLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 dark:bg-white/[0.08] hover:bg-slate-700 dark:hover:bg-white/[0.12] text-white dark:text-[#E2E8F0] text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
              >
                {exportLoading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Download className="w-4 h-4" />}
                {exportLoading ? 'Génération…' : 'Télécharger mes données (JSON)'}
              </button>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 5 : ASSISTANT IA
        ══════════════════════════════════════════════════════════ */}
        {activeTab === 'ia' && (
          <motion.div key="ia" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-4">

            <div className={cardCls}>
              <SectionHeader icon={Bot} title="Assistant IA (Claude)"
                sub="Configurez votre clé API Anthropic pour activer l'assistant" color="sky" />

              <AnimatePresence>
                {iaMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
                      iaMsg.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                        : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400'
                    }`}
                  >
                    {iaMsg.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    {iaMsg.text}
                  </motion.div>
                )}
              </AnimatePresence>

              <Field
                label="Clé API Anthropic"
                hint="Obtenez votre clé sur console.anthropic.com — commence par sk-ant-"
              >
                <input
                  type="password"
                  value={iaApiKey}
                  onChange={e => setIaApiKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className={`${inputCls} font-mono`}
                />
              </Field>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => {
                    try {
                      if (iaApiKey.trim()) localStorage.setItem('ordosur_anthropic_key', iaApiKey.trim());
                      else localStorage.removeItem('ordosur_anthropic_key');
                      setIaMsg({ type: 'success', text: '✓ Clé API sauvegardée dans le navigateur.' });
                      setTimeout(() => setIaMsg(null), 3000);
                    } catch {
                      setIaMsg({ type: 'error', text: 'Erreur lors de la sauvegarde.' });
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#00A86B] hover:bg-[#006B47] text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Sauvegarder
                </button>

                <button
                  disabled={!iaApiKey.trim() || iaTesting}
                  onClick={async () => {
                    setIaTesting(true); setIaMsg(null);
                    try {
                      const res = await fetch('https://api.anthropic.com/v1/messages', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'x-api-key': iaApiKey.trim(),
                          'anthropic-version': '2023-06-01',
                          'anthropic-dangerous-allow-browser': 'true',
                        },
                        body: JSON.stringify({
                          model: 'claude-opus-4-5',
                          max_tokens: 10,
                          messages: [{ role: 'user', content: 'Test' }],
                        }),
                      });
                      if (res.ok) {
                        setIaMsg({ type: 'success', text: '✅ Connexion réussie ! Clé API valide.' });
                      } else {
                        const d = await res.json().catch(() => ({}));
                        throw new Error((d as { error?: { message?: string } })?.error?.message || `HTTP ${res.status}`);
                      }
                    } catch (e: unknown) {
                      setIaMsg({ type: 'error', text: `❌ Erreur : ${e instanceof Error ? e.message : String(e)}` });
                    } finally {
                      setIaTesting(false);
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-[#94A3B8] text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors disabled:opacity-50"
                >
                  {iaTesting && <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />}
                  Tester la connexion
                </button>
              </div>
            </div>

            <div className={cardCls}>
              <SectionHeader icon={Bot} title="Modèle et capacités"
                sub="Informations sur l'assistant IA" color="violet" />

              <div className="space-y-3">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-100 dark:border-white/[0.06]">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0]">Modèle actif</p>
                    <p className="text-xs text-slate-400 dark:text-[#475569] mt-0.5">Version Claude utilisée</p>
                  </div>
                  <span className="px-3 py-1 bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 text-xs font-bold rounded-full">
                    claude-opus-4-5
                  </span>
                </div>

                {[
                  'Gestion de la clinique et des médecins',
                  'Questions médicales générales',
                  'Analyse des interactions médicamenteuses',
                  "Optimisation de l'agenda et des processus",
                  'Interprétation des statistiques',
                ].map(cap => (
                  <div key={cap} className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-[#94A3B8]">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {cap}
                  </div>
                ))}

                <p className="text-xs text-slate-400 dark:text-[#475569] pt-1 italic">
                  Les réponses sont indicatives et ne remplacent pas l'expertise médicale.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Password Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showPwdModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowPwdModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{    opacity: 0, scale: 0.95, y: 16  }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              className="relative w-full max-w-md bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/[0.08] p-6 space-y-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-[#E2E8F0]">Changer le mot de passe</h2>
                </div>
                <button onClick={() => setShowPwdModal(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/[0.07] rounded-lg transition-colors">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <StatusMsg msg={pwdMsg} />

              <Field label="Nouveau mot de passe">
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={pwd} onChange={e => setPwd(e.target.value)}
                    className={inputCls} placeholder="Minimum 8 caractères"
                  />
                  <button onClick={() => setShowPwd(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Strength indicator */}
                {pwd.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {[1,2,3,4].map(n => (
                      <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${
                        pwd.length >= n * 3
                          ? n <= 1 ? 'bg-red-400' : n <= 2 ? 'bg-amber-400' : n <= 3 ? 'bg-yellow-400' : 'bg-emerald-400'
                          : 'bg-slate-200 dark:bg-white/[0.08]'
                      }`} />
                    ))}
                  </div>
                )}
              </Field>

              <Field label="Confirmer le mot de passe">
                <input
                  type="password" value={pwdConfirm}
                  onChange={e => setPwdConfirm(e.target.value)}
                  className={inputCls} placeholder="Répétez le mot de passe"
                />
              </Field>

              <div className="flex gap-3">
                <button
                  onClick={changePassword}
                  disabled={pwdSaving || !pwd || !pwdConfirm}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
                >
                  {pwdSaving
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Lock className="w-4 h-4" />}
                  {pwdSaving ? 'Modification…' : 'Modifier'}
                </button>
                <button onClick={() => setShowPwdModal(false)}
                  className="px-5 py-2.5 border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-[#94A3B8] text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors">
                  Annuler
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
