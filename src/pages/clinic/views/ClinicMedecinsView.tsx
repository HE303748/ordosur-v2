import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, UserPlus, X, Users, FileText, Calendar,
  ChevronRight, Mail, Hash, Stethoscope, Send, CheckCircle,
  Copy, AlertCircle, BarChart2, ShieldOff,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, Tooltip as RTooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { PageTransition } from '../../../components/ui/PageTransition';
import { supabase } from '../../../lib/supabase';

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Types ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

export interface DoctorWithProfile {
  id: string;
  user_id: string;
  rpps: string | null;
  specialite: string | null;
  prenom: string;
  nom: string;
  email?: string;
}

interface DoctorStats {
  ordonnances: number;
  patients: number;
  rdvCeMois: number;
}

interface RecentOrd {
  id: string;
  date: string;
  created_at: string;
  patient_id: string;
  statut: string | null;
  patient_name?: string;
}

interface ChartDay {
  label: string;
  count: number;
}

type FilterType = 'all' | 'actifs' | 'conge';

const SPECIALITES = [
  'GÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©raliste', 'Cardiologue', 'Dermatologue', 'PÃƒÆ’Ã‚Â©diatre',
  'GynÃƒÆ’Ã‚Â©cologue', 'Ophtalmologue', 'ORL', 'Neurologue',
  'Psychiatre', 'Chirurgien', 'Urgentiste', 'Autre',
];

const AVATAR_GRADIENTS = [
  '[#00A86B]',
  'from-violet-400 to-purple-500',
  'from-[#00A86B] to-[#006B47]',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  '[#00A86B]',
];

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Invite Modal ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

function InviteModal({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const [form, setForm] = useState({
    email: '', prenom: '', nom: '', specialite: '', message: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied]   = useState(false);

  function update(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email.trim())  { setError("L'email est requis");  return; }
    if (!form.prenom.trim()) { setError('Le prÃƒÆ’Ã‚Â©nom est requis'); return; }
    if (!form.nom.trim())    { setError('Le nom est requis');    return; }
    setError('');
    setLoading(true);
    try {
      // Check duplicate
      const { data: existing } = await supabase
        .from('clinic_invitations')
        .select('id')
        .eq('org_id', orgId)
        .eq('email', form.email.trim())
        .eq('statut', 'pending')
        .maybeSingle();

      if (existing) {
        setError('Une invitation est dÃƒÆ’Ã‚Â©jÃƒÆ’Ã‚Â  en attente pour cet email.');
        setLoading(false);
        return;
      }

      const { data, error: dbErr } = await supabase
        .from('clinic_invitations')
        .insert({
          org_id:    orgId,
          email:     form.email.trim(),
          prenom:    form.prenom.trim(),
          nom:       form.nom.trim(),
          specialite: form.specialite || null,
        })
        .select('token')
        .single();

      if (dbErr) throw dbErr;

      const token = data?.token as string | undefined;
      setInviteLink(
        token
          ? `${window.location.origin}/accept-invitation?token=${token}`
          : `${window.location.origin}/accept-invitation`
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'invitation");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const inputCls = "w-full px-4 py-2.5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl text-sm text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 dark:focus:ring-[#00A86B]/40 placeholder-slate-400 dark:placeholder-slate-600";
  const labelCls = "block text-xs font-semibold text-slate-700 dark:text-[#94A3B8] mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl shadow-2xl w-full max-w-lg p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00A86B]/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-[#00A86B]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-[#E2E8F0]">Inviter un mÃƒÆ’Ã‚Â©decin</h3>
              <p className="text-xs text-slate-400 dark:text-[#64748B]">Lien valable 7 jours</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.07] text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {inviteLink ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  Invitation crÃƒÆ’Ã‚Â©ÃƒÆ’Ã‚Â©e pour {form.prenom} {form.nom}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
                  Copiez le lien et envoyez-le au mÃƒÆ’Ã‚Â©decin
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] mb-2 font-medium">Lien d'invitation :</p>
              <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl">
                <p className="text-xs text-slate-600 dark:text-[#E2E8F0] flex-1 truncate font-mono">{inviteLink}</p>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 p-1.5 hover:bg-slate-200 dark:hover:bg-white/[0.1] rounded-lg transition-colors"
                >
                  {copied
                    ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                    : <Copy className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-[#00A86B] hover:bg-[#006B47] text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className={labelCls}>Email <span className="text-red-500">*</span></label>
              <input type="email" value={form.email} onChange={update('email')}
                placeholder="medecin@exemple.com" className={inputCls} />
            </div>

            {/* Prenom + Nom */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>PrÃƒÆ’Ã‚Â©nom <span className="text-red-500">*</span></label>
                <input type="text" value={form.prenom} onChange={update('prenom')}
                  placeholder="Mohamed" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Nom <span className="text-red-500">*</span></label>
                <input type="text" value={form.nom} onChange={update('nom')}
                  placeholder="Benali" className={inputCls} />
              </div>
            </div>

            {/* Specialite select */}
            <div>
              <label className={labelCls}>SpÃƒÆ’Ã‚Â©cialitÃƒÆ’Ã‚Â©</label>
              <select value={form.specialite} onChange={update('specialite')} className={inputCls}>
                <option value="">SÃƒÆ’Ã‚Â©lectionnerÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦</option>
                {SPECIALITES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Message optionnel */}
            <div>
              <label className={labelCls}>Message personnalisÃƒÆ’Ã‚Â© (optionnel)</label>
              <textarea
                value={form.message} onChange={update('message')} rows={2}
                placeholder="Bienvenue dans notre ÃƒÆ’Ã‚Â©quipeÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦"
                className={`${inputCls} resize-none`}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-[#94A3B8] rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 py-2.5 bg-[#00A86B] hover:bg-[#006B47] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                {loading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Send className="w-4 h-4" />}
                Envoyer l'invitation
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Custom Recharts Tooltip ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

function CustomBarTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number }>; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1E293B] border border-white/10 rounded-lg px-2.5 py-1.5 shadow-xl">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="text-sm font-bold text-white">{payload[0].value} ord.</p>
    </div>
  );
}

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Main Component ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

interface ClinicMedecinsViewProps {
  doctors: DoctorWithProfile[];
  orgId?: string;
  onDoctorsChange?: () => void;
}

export function ClinicMedecinsView({ doctors, orgId, onDoctorsChange }: ClinicMedecinsViewProps) {
  const [search, setSearch]             = useState('');
  const [filterTab, setFilterTab]       = useState<FilterType>('all');
  const [selected, setSelected]         = useState<DoctorWithProfile | null>(null);
  const [showInvite, setShowInvite]     = useState(false);

  // Detail panel state
  const [stats, setStats]               = useState<DoctorStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [recentOrds, setRecentOrds]     = useState<RecentOrd[]>([]);
  const [ordsLoading, setOrdsLoading]   = useState(false);
  const [chartData, setChartData]       = useState<ChartDay[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  const loadedRef = useRef<string | null>(null);

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Filter + search
  const filtered = doctors.filter(d => {
    const q = search.toLowerCase();
    const matchQ = !q
      || d.prenom.toLowerCase().includes(q)
      || d.nom.toLowerCase().includes(q)
      || (d.specialite ?? '').toLowerCase().includes(q);
    // No real status on doctors table ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ filterTab is UI-only for now
    return matchQ;
  });

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Load detail data when doctor selected
  useEffect(() => {
    if (!selected || selected.id === loadedRef.current) return;
    loadedRef.current = selected.id;
    setStats(null);
    setRecentOrds([]);
    setChartData([]);
    loadDoctorData(selected);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  async function loadDoctorData(doc: DoctorWithProfile) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Stats
    setStatsLoading(true);
    const [ordTotal, patTotal, rdvMonth] = await Promise.all([
      supabase.from('ordonnances').select('id', { count: 'exact', head: true }).eq('doctor_id', doc.id),
      supabase.from('patients').select('id', { count: 'exact', head: true }).eq('org_id', orgId ?? ''),
      supabase.from('rdv').select('id', { count: 'exact', head: true }).eq('doctor_id', doc.id).gte('created_at', startOfMonth),
    ]);
    setStats({
      ordonnances: ordTotal.count ?? 0,
      patients:    patTotal.count ?? 0,
      rdvCeMois:   rdvMonth.count ?? 0,
    });
    setStatsLoading(false);

    // Recent ordonnances
    setOrdsLoading(true);
    const { data: ords } = await supabase
      .from('ordonnances')
      .select('id, date, created_at, patient_id, statut')
      .eq('doctor_id', doc.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (ords?.length) {
      const patIds = [...new Set(ords.map(o => o.patient_id).filter(Boolean))];
      const { data: pats } = await supabase
        .from('patients').select('id, prenom, nom').in('id', patIds);
      const patMap = new Map((pats ?? []).map(p => [p.id, `${p.prenom} ${p.nom}`]));
      setRecentOrds(ords.map(o => ({ ...o, patient_name: patMap.get(o.patient_id) ?? 'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â' })));
    } else {
      setRecentOrds([]);
    }
    setOrdsLoading(false);

    // Activity chart ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â last 30 days
    setChartLoading(true);
    const { data: actData } = await supabase
      .from('ordonnances')
      .select('created_at')
      .eq('doctor_id', doc.id)
      .gte('created_at', thirtyDaysAgo);

    // Build 10-bar buckets (every 3 days)
    const buckets: ChartDay[] = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(now.getTime() - (9 - i) * 3 * 24 * 60 * 60 * 1000);
      return {
        label: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        count: 0,
      };
    });
    (actData ?? []).forEach(o => {
      const oDate = new Date(o.created_at);
      const diffDays = Math.floor((now.getTime() - oDate.getTime()) / (24 * 60 * 60 * 1000));
      const bucketIdx = 9 - Math.floor(diffDays / 3);
      if (bucketIdx >= 0 && bucketIdx < 10) buckets[bucketIdx].count++;
    });
    setChartData(buckets);
    setChartLoading(false);
  }

  function selectDoctor(doc: DoctorWithProfile) {
    if (doc.id === selected?.id) return;
    loadedRef.current = null;
    setSelected(doc);
    setShowDisableConfirm(false);
  }

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all',    label: 'Tous'     },
    { key: 'actifs', label: 'Actifs'   },
    { key: 'conge',  label: 'En congÃƒÆ’Ã‚Â©' },
  ];

  return (
    <PageTransition>
      <div className="flex gap-5 p-6 h-[calc(100vh-4rem)] overflow-hidden">

        {/* ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â LEFT: doctor list ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â */}
        <div className="w-[360px] flex-shrink-0 flex flex-col gap-3">

          {/* Invite button */}
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#00A86B] hover:bg-[#006B47] active:scale-[0.98] text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-[#00A86B]/20"
          >
            <UserPlus className="w-4 h-4" />
            + Inviter un mÃƒÆ’Ã‚Â©decin
          </button>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou spÃƒÆ’Ã‚Â©cialitÃƒÆ’Ã‚Â©ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦"
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] rounded-xl text-sm text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 dark:focus:ring-[#00A86B]/40 placeholder-slate-400"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilterTab(f.key)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filterTab === f.key
                    ? 'bg-[#00A86B] text-white'
                    : 'bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-[#94A3B8] hover:border-[#00A86B]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <Users className="w-10 h-10 text-slate-200 dark:text-slate-700 mb-3" />
                <p className="text-sm text-slate-400 dark:text-slate-600">Aucun mÃƒÆ’Ã‚Â©decin trouvÃƒÆ’Ã‚Â©</p>
              </div>
            ) : filtered.map((doc, idx) => {
              const initials = `${doc.prenom[0] ?? ''}${doc.nom[0] ?? ''}`.toUpperCase();
              const grad     = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
              const isActive = selected?.id === doc.id;

              return (
                <motion.div
                  key={doc.id}
                  whileHover={{ y: -1 }}
                  onClick={() => selectDoctor(doc)}
                  className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer border transition-all ${
                    isActive
                      ? 'bg-[#E6F4EE] dark:bg-[#00A86B]/10 border-[#00A86B] dark:border-[#00A86B]/40 shadow-sm'
                      : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-white/[0.06] hover:border-[#00A86B]/20 dark:hover:border-white/[0.12]'
                  }`}
                  style={isActive ? { borderLeftWidth: 3, borderLeftColor: '#00A86B' } : {}}
                >
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] truncate">
                      Dr. {doc.prenom} {doc.nom}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-[#94A3B8] truncate">
                      {doc.specialite ?? 'MÃƒÆ’Ã‚Â©decin gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©raliste'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <ChevronRight className={`w-4 h-4 ${isActive ? 'text-[#00A86B]' : 'text-slate-300 dark:text-slate-600'}`} />
                  </div>
                </motion.div>
              );
            })}
          </div>

          <p className="text-xs text-center text-slate-400 dark:text-slate-600 pb-1">
            {filtered.length} mÃƒÆ’Ã‚Â©decin{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â RIGHT: detail panel ÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚ÂÃƒÂ¢Ã¢â‚¬Â¢Ã‚Â */}
        <div className="flex-1 bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.06] rounded-2xl shadow-sm overflow-y-auto">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="p-6 space-y-6"
              >
                {/* Header */}
                <div className="flex items-start gap-5">
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${
                    AVATAR_GRADIENTS[doctors.indexOf(selected) % AVATAR_GRADIENTS.length]
                  } flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-lg`}>
                    {`${selected.prenom[0] ?? ''}${selected.nom[0] ?? ''}`.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-[#E2E8F0]">
                      Dr. {selected.prenom} {selected.nom}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-0.5">
                      {selected.specialite ?? 'MÃƒÆ’Ã‚Â©decin gÃƒÆ’Ã‚Â©nÃƒÆ’Ã‚Â©raliste'}
                    </p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {selected.rpps && (
                        <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                          <Hash className="w-3 h-3" />RPPS {selected.rpps}
                        </span>
                      )}
                      {selected.email && (
                        <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                          <Mail className="w-3 h-3" />{selected.email}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-emerald-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Actif
                      </span>
                    </div>
                  </div>
                </div>

                {/* KPI mini-cards */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Ordonnances',  value: stats?.ordonnances, icon: FileText, color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10' },
                    { label: 'Patients org', value: stats?.patients,    icon: Users,    color: 'text-[#00A86B] bg-[#E6F4EE] dark:bg-[#00A86B]/10'       },
                    { label: 'RDV ce mois',  value: stats?.rdvCeMois,   icon: Calendar, color: 'text-[#00A86B] bg-[#E6F4EE] dark:bg-[#00A86B]/10'           },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-slate-50 dark:bg-[#1E293B] border border-slate-100 dark:border-white/[0.05] rounded-xl p-3 text-center">
                      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mx-auto mb-2`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {statsLoading
                        ? <div className="h-5 w-8 bg-slate-200 dark:bg-white/[0.07] rounded animate-pulse mx-auto mb-1" />
                        : <p className="text-lg font-bold text-slate-900 dark:text-[#E2E8F0]">{value ?? 'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â'}</p>}
                      <p className="text-xs text-slate-400 dark:text-[#94A3B8]">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Activity chart */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart2 className="w-4 h-4 text-[#00A86B]" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">
                      ActivitÃƒÆ’Ã‚Â© ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 30 derniers jours
                    </h3>
                  </div>
                  {chartLoading ? (
                    <div className="h-24 bg-slate-100 dark:bg-white/[0.04] rounded-xl animate-pulse" />
                  ) : (
                    <div className="h-24">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} barSize={12} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 9, fill: '#64748B' }}
                            axisLine={false}
                            tickLine={false}
                            interval={1}
                          />
                          <RTooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(14,165,233,0.06)' }} />
                          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                            {chartData.map((d, i) => (
                              <Cell
                                key={i}
                                fill={d.count > 0 ? '#00A86B' : '#E2E8F0'}
                                fillOpacity={d.count > 0 ? 0.85 : 0.35}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Recent ordonnances */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-violet-500" />
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">
                      5 derniÃƒÆ’Ã‚Â¨res ordonnances
                    </h3>
                  </div>
                  {ordsLoading ? (
                    <div className="space-y-2">
                      {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 dark:bg-white/[0.04] rounded-xl animate-pulse" />)}
                    </div>
                  ) : recentOrds.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-600 py-4 text-center">Aucune ordonnance</p>
                  ) : (
                    <div className="space-y-2">
                      {recentOrds.map(o => (
                        <div
                          key={o.id}
                          className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-[#1E293B] border border-slate-100 dark:border-white/[0.05] rounded-xl"
                        >
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-[#E2E8F0]">
                              {o.patient_name}
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-[#64748B]">
                              {new Date(o.date || o.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            o.statut === 'active'
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                              : o.statut === 'expired'
                              ? 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400'
                              : 'bg-slate-100 text-slate-400 dark:bg-white/[0.07]'
                          }`}>
                            {o.statut === 'active' ? 'Active' : o.statut === 'expired' ? 'ExpirÃƒÆ’Ã‚Â©e' : 'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-1">
                  <button
                    disabled
                    className="flex-1 py-2.5 border border-slate-200 dark:border-white/[0.1] text-slate-400 dark:text-slate-600 rounded-xl text-sm font-medium cursor-not-allowed opacity-60"
                    title="BientÃƒÆ’Ã‚Â´t disponible"
                  >
                    Modifier profil
                  </button>
                  {showDisableConfirm ? (
                    <div className="flex-1 flex gap-2">
                      <button
                        onClick={() => setShowDisableConfirm(false)}
                        className="flex-1 py-2.5 border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-[#94A3B8] rounded-xl text-xs font-medium hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        disabled
                        className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-xs font-semibold opacity-60 cursor-not-allowed"
                        title="FonctionnalitÃƒÆ’Ã‚Â© bientÃƒÆ’Ã‚Â´t disponible"
                      >
                        Confirmer
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDisableConfirm(true)}
                      className="flex-1 py-2.5 border border-red-200 dark:border-red-500/30 text-red-500 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
                    >
                      <ShieldOff className="w-4 h-4" />
                      DÃƒÆ’Ã‚Â©sactiver compte
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-10"
              >
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center mb-4">
                  <Stethoscope className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-sm font-semibold text-slate-400 dark:text-slate-600">
                  SÃƒÆ’Ã‚Â©lectionnez un mÃƒÆ’Ã‚Â©decin
                </p>
                <p className="text-xs text-slate-300 dark:text-slate-700 mt-1">
                  pour afficher sa fiche, ses statistiques et son activitÃƒÆ’Ã‚Â©
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInvite && orgId && (
          <InviteModal
            orgId={orgId}
            onClose={() => { setShowInvite(false); onDoctorsChange?.(); }}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
