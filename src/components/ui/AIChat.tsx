import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X, Send, Bot, User, Sparkles, Search, UserCheck,
  Copy, Check, RotateCcw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ── Constantes ───────────────────────────────────────────────────────────────

const EDGE_FUNCTION_URL =
  'https://yxzvukryngvlzjgaydqj.supabase.co/functions/v1/ai-chat';

const MAX_HISTORY = 20;

const SYSTEM_PROMPT =
  `Tu es un assistant médical expert intégré dans Ordosur, plateforme de prescription médicale marocaine.

Tu aides les médecins marocains francophones avec :
- Posologie et mode d'emploi des médicaments
- Interactions médicamenteuses entre les médicaments
- Contre-indications selon les pathologies et allergies du patient
- Diagnostic différentiel et orientation clinique
- Recommandations thérapeutiques basées sur les guidelines
- Questions générales de médecine

Règles importantes :
- Réponds toujours en français
- Sois concis et précis (médecin occupé)
- Utilise la terminologie médicale professionnelle
- Rappelle toujours que tes réponses sont indicatives et ne remplacent pas le jugement clinique
- Si un patient est sélectionné, tiens compte de ses pathologies et allergies dans tes réponses`;

const DEFAULT_SUGGESTED = [
  'Posologie Amoxicilline adulte ?',
  'Interactions Metformine + Ibuprofène ?',
  'Traitement HTA première intention ?',
  "Symptômes insuffisance rénale ?",
];

// ── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PatientOption {
  id: string;
  prenom: string;
  nom: string;
  pathologies?: string[] | null;
  allergies_medicaments?: string[] | null;
}

export interface AIChatProps {
  onClose: () => void;
  selectedPatient?: PatientOption | null;
  patients?: PatientOption[];
  systemPrompt?: string;
  suggestedQuestions?: string[];
  contextLabel?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <button
      onClick={copy}
      title="Copier la réponse"
      className="p-1 text-slate-300 hover:text-slate-500 dark:hover:text-slate-400 transition-colors rounded"
    >
      {copied
        ? <Check className="w-3 h-3 text-emerald-500" />
        : <Copy className="w-3 h-3" />}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AIChat({
  onClose,
  selectedPatient,
  patients = [],
  systemPrompt,
  suggestedQuestions,
  contextLabel,
}: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Patient interne ──────────────────────────────────────────────────────
  const [activePatient, setActivePatient] = useState<PatientOption | null>(selectedPatient || null);
  const [patientSearch, setPatientSearch]   = useState('');
  const [showPatientDrop, setShowPatientDrop] = useState(false);

  const filteredPatients = patientSearch.trim().length >= 1
    ? patients
        .filter(p => `${p.prenom} ${p.nom}`.toLowerCase().includes(patientSearch.toLowerCase()))
        .slice(0, 20)
    : [];

  const selectPatient = (p: PatientOption) => {
    setActivePatient(p);
    setPatientSearch('');
    setShowPatientDrop(false);
    setMessages([]);
  };

  const clearPatient = () => {
    setActivePatient(null);
    setMessages([]);
  };

  // ── Prompts ──────────────────────────────────────────────────────────────
  const effectiveSystem = systemPrompt || SYSTEM_PROMPT;

  const patientCtx = activePatient
    ? `\n\nContexte patient actif : ${activePatient.prenom} ${activePatient.nom}` +
      (activePatient.pathologies?.length
        ? `, pathologies : ${activePatient.pathologies.join(', ')}`
        : '') +
      (activePatient.allergies_medicaments?.length
        ? `, allergies médicamenteuses : ${activePatient.allergies_medicaments.join(', ')}`
        : '')
    : '';

  // ── Questions suggérées selon contexte ──────────────────────────────────
  const contextSuggestions: string[] = suggestedQuestions ||
    (activePatient?.pathologies?.length
      ? [
          ...activePatient.pathologies.slice(0, 2).map(
            p => `Traitement ${p} : quelle posologie recommandez-vous ?`
          ),
          ...(activePatient.allergies_medicaments?.length
            ? [`Alternatives à ${activePatient.allergies_medicaments[0]} pour ce patient ?`]
            : ['Interactions à surveiller pour ce patient ?']),
          'Quels examens biologiques de suivi conseiller ?',
        ]
      : DEFAULT_SUGGESTED);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Nouvelle conversation ────────────────────────────────────────────────
  const resetConversation = () => setMessages([]);

  // ── Envoi message via Edge Function ─────────────────────────────────────
  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: 'user', content: trimmed, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Récupérer la session utilisateur
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('session_expired');

      // Limiter à MAX_HISTORY messages (sans timestamps pour l'API)
      const conversationMessages = [...messages, userMsg]
        .slice(-MAX_HISTORY)
        .map(m => ({ role: m.role, content: m.content }));

      // Appel via Edge Function sécurisée
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          system: effectiveSystem + patientCtx,
          messages: conversationMessages,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const assistantText = data.content?.[0]?.text || 'Réponse vide.';

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: assistantText, timestamp: new Date() },
      ]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const displayMsg =
        errMsg === 'session_expired'
          ? '⚠️ Session expirée. Veuillez vous reconnecter.'
          : errMsg.includes('Clé API non configurée') || errMsg.includes('configurée')
          ? '🔑 Service IA non configuré. Contactez votre administrateur.'
          : errMsg.includes('non autorisé') || errMsg.includes('401')
          ? '❌ Accès non autorisé.'
          : '⚠️ Service IA temporairement indisponible. Réessayez dans quelques instants.';

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: displayMsg, timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      className="fixed right-0 top-0 bottom-0 w-[400px] z-50 flex flex-col
        bg-white dark:bg-[#111827]
        border-l border-slate-200 dark:border-white/[0.06]
        shadow-2xl"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 py-4 bg-[#0A1628] flex-shrink-0">
        <div className="w-9 h-9 bg-[#00A86B]/20 rounded-md flex items-center justify-center">
          <Bot className="w-5 h-5 text-[#00A86B]" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-white font-bold text-[15px] leading-tight">Assistant Ordosur</h2>
          <p className="text-white/50 text-xs">{contextLabel || 'Powered by Claude Haiku'}</p>
        </div>

        {/* Nouvelle conversation */}
        {messages.length > 0 && (
          <button
            onClick={resetConversation}
            title="Nouvelle conversation"
            className="p-1.5 text-white/60 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}

        {activePatient && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 rounded-lg max-w-[100px]">
            <UserCheck className="w-3 h-3 text-white/80 flex-shrink-0" />
            <span className="text-white text-[11px] font-medium truncate">
              {activePatient.prenom} {activePatient.nom}
            </span>
          </div>
        )}

        <button
          onClick={onClose}
          className="p-1.5 text-white/60 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Sélecteur patient ── */}
      {patients.length > 0 && (
        <div className="px-3 py-2.5 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-[#0C1525] flex-shrink-0">
          {activePatient ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-[#E6F4EE] dark:bg-[#00A86B]/10 border border-[#00A86B]/20 dark:border-[#00A86B]/20 rounded-md">
                <UserCheck className="w-3.5 h-3.5 text-[#00A86B] flex-shrink-0" />
                <span className="text-xs font-semibold text-[#006B47] dark:text-[#00A86B] truncate">
                  {activePatient.prenom} {activePatient.nom}
                </span>
              </div>
              <button
                onClick={clearPatient}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-[#94A3B8] border border-slate-200 dark:border-white/[0.1] rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors whitespace-nowrap"
              >
                Sans patient
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  value={patientSearch}
                  onChange={e => { setPatientSearch(e.target.value); setShowPatientDrop(true); }}
                  onFocus={() => setShowPatientDrop(true)}
                  onBlur={() => setTimeout(() => setShowPatientDrop(false), 200)}
                  placeholder="Associer un patient…"
                  className="w-full pl-8 pr-3 py-1.5 text-xs
                    border border-[#E5E5E0] dark:border-white/[0.1]
                    rounded-md bg-white dark:bg-[#1E293B]
                    text-[#0A1628] dark:text-[#E2E8F0]
                    placeholder-[#94A3B8] dark:placeholder-slate-600
                    focus:outline-none focus:ring-2 focus:ring-[#00A86B]/30 focus:border-[#00A86B]"
                />
              </div>
              {showPatientDrop && filteredPatients.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredPatients.map(p => (
                    <button
                      key={p.id}
                      onMouseDown={e => { e.preventDefault(); selectPatient(p); }}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-[#E6F4EE] dark:hover:bg-[#00A86B]/[0.08] transition-colors border-b border-slate-50 dark:border-white/[0.04] last:border-b-0"
                    >
                      <span className="font-semibold text-slate-900 dark:text-[#E2E8F0]">{p.prenom} {p.nom}</span>
                      {p.pathologies?.[0] && (
                        <span className="ml-2 text-slate-400 dark:text-[#475569]">· {p.pathologies[0]}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {showPatientDrop && patientSearch.trim().length >= 1 && filteredPatients.length === 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/[0.1] rounded-xl shadow-lg px-3 py-2 text-xs text-slate-400 dark:text-[#475569]">
                  Aucun patient trouvé
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Welcome + suggestions */}
        {messages.length === 0 && (
          <>
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-[#E6F4EE] dark:bg-[#00A86B]/20 rounded-md flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-[#00A86B]" />
              </div>
              <div className="bg-slate-100 dark:bg-white/[0.07] rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-700 dark:text-[#94A3B8] leading-relaxed">
                Bonjour ! Je suis votre assistant médical. Posez-moi vos questions sur les interactions, posologies ou pathologies.
                {activePatient && (
                  <p className="mt-2 text-[#00A86B] font-semibold text-xs">
                    👤 Patient : {activePatient.prenom} {activePatient.nom}
                    {activePatient.pathologies?.length ? ` · ${activePatient.pathologies.slice(0, 2).join(', ')}` : ''}
                  </p>
                )}
                {!activePatient && patients.length > 0 && (
                  <p className="mt-2 text-slate-400 dark:text-[#475569] text-xs">
                    💡 Vous pouvez associer un patient pour contextualiser la conversation.
                  </p>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-600 font-semibold text-center uppercase tracking-wide pt-2">
              {activePatient ? 'Questions suggérées pour ce patient' : 'Suggestions'}
            </p>
            <div className="space-y-2">
              {contextSuggestions.map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="w-full text-left text-xs px-3 py-2.5
                    bg-[#E6F4EE] dark:bg-[#00A86B]/[0.08]
                    text-[#006B47] dark:text-[#00A86B]
                    rounded-md hover:bg-[#d4eee0] dark:hover:bg-[#00A86B]/[0.14]
                    transition-colors
                    border border-[#00A86B]/10 dark:border-[#00A86B]/20
                    font-medium leading-relaxed"
                >
                  {q}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-[#00A86B]' : 'bg-slate-100 dark:bg-white/[0.07]'
            }`}>
              {msg.role === 'user'
                ? <User className="w-4 h-4 text-white" />
                : <Bot  className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              }
            </div>
            <div className={`max-w-[78%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-[#00A86B] text-white rounded-br-[4px]'
                  : 'bg-[#FAFAF7] dark:bg-white/[0.07] text-[#0A1628] dark:text-[#94A3B8] border border-[#E5E5E0] dark:border-white/[0.06] rounded-bl-[4px]'
              }`}>
                {msg.content}
              </div>
              {/* Timestamp + copy (réponses IA uniquement) */}
              <div className={`flex items-center gap-1.5 px-1 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <span className="text-[10px] text-slate-300 dark:text-slate-600 tabular-nums">
                  {formatTime(msg.timestamp)}
                </span>
                {msg.role === 'assistant' && <CopyButton text={msg.content} />}
              </div>
            </div>
          </div>
        ))}

        {/* Indicateur de frappe animé */}
        {loading && (
          <div className="flex gap-2.5">
            <div className="w-8 h-8 bg-slate-100 dark:bg-white/[0.07] rounded-xl flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="bg-slate-100 dark:bg-white/[0.07] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
              {[0, 150, 300].map(d => (
                <div
                  key={d}
                  className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="p-4 border-t border-slate-100 dark:border-white/[0.06] flex-shrink-0">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
            }}
            placeholder={
              activePatient
                ? `Question sur ${activePatient.prenom} ${activePatient.nom}…`
                : 'Posez votre question médicale…'
            }
            className="flex-1 px-4 py-2.5
              bg-[#FAFAF7] dark:bg-[#1E293B]
              border border-[#E5E5E0] dark:border-white/[0.1]
              rounded-md text-sm
              text-[#0A1628] dark:text-[#E2E8F0]
              placeholder-[#94A3B8] dark:placeholder-slate-600
              focus:outline-none focus:ring-2 focus:ring-[#00A86B]/30 focus:border-[#00A86B]
              transition-all"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="px-3.5 py-2.5 bg-[#00A86B] text-white rounded-md hover:bg-[#006B47] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-[#94A3B8] dark:text-slate-600 mt-2 text-center italic">
          Indicatif — ne remplace pas le jugement clinique
        </p>
      </div>
    </motion.div>
  );
}
