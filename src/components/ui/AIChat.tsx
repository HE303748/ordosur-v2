import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';

// Resolve API key: localStorage first, then env variable
function getApiKey(): string {
  try {
    const stored = localStorage.getItem('ordosur_anthropic_key');
    if (stored && stored.trim()) return stored.trim();
  } catch {}
  return import.meta.env.VITE_ANTHROPIC_API_KEY || '';
}

const DEFAULT_SYSTEM_PROMPT =
  'Tu es un assistant médical expert pour les médecins marocains francophones. ' +
  'Tu fournis des informations médicales précises sur les médicaments, interactions, posologies et pathologies. ' +
  'Tu es concis, précis et professionnel. ' +
  "Tu rappelles toujours que tes réponses sont indicatives et ne remplacent pas le jugement clinique.";

const DEFAULT_SUGGESTED = [
  'Interactions Metformine + Ibuprofène ?',
  'Posologie Amoxicilline enfant 10 kg ?',
  'Contre-indications Ramipril en HTA ?',
  "Alternatives à la Codéine chez l'enfant ?",
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIChatProps {
  onClose: () => void;
  selectedPatient?: {
    prenom: string;
    nom: string;
    pathologies?: string[];
    allergies_medicaments?: string[];
  } | null;
  /** Custom system prompt — defaults to doctor medical prompt */
  systemPrompt?: string;
  /** Custom suggested questions — defaults to doctor questions */
  suggestedQuestions?: string[];
  /** Context label shown in header */
  contextLabel?: string;
}

export function AIChat({
  onClose,
  selectedPatient,
  systemPrompt,
  suggestedQuestions,
  contextLabel,
}: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const effectiveSystem = systemPrompt || DEFAULT_SYSTEM_PROMPT;
  const effectiveSuggested = suggestedQuestions || DEFAULT_SUGGESTED;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const patientCtx = selectedPatient
    ? `\n\nContexte patient actif : ${selectedPatient.prenom} ${selectedPatient.nom}` +
      (selectedPatient.pathologies?.length
        ? `, pathologies : ${selectedPatient.pathologies.join(', ')}`
        : '') +
      (selectedPatient.allergies_medicaments?.length
        ? `, allergies : ${selectedPatient.allergies_medicaments.join(', ')}`
        : '')
    : '';

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: Message = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error('no_key');
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-allow-browser': 'true',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 1024,
          system: effectiveSystem + patientCtx,
          messages: [...messages, userMsg],
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.content?.[0]?.text || 'Réponse vide.' },
      ]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const msg =
        errMsg === 'no_key'
          ? '🔑 Clé API manquante. Configurez votre clé API dans les paramètres (onglet 🤖 IA).'
          : errMsg.includes('401') || errMsg.includes('invalid')
          ? '❌ Clé API invalide. Vérifiez votre clé dans Paramètres → IA.'
          : `⚠️ Erreur de connexion à l'API Anthropic : ${errMsg}`;
      setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
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
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-sky-500 to-cyan-500 flex-shrink-0">
        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-white font-bold text-[15px] leading-tight">Assistant Ordosur</h2>
          <p className="text-sky-100/70 text-xs">
            {contextLabel || 'Powered by Claude'}
          </p>
        </div>
        {selectedPatient && (
          <div className="px-2.5 py-1 bg-white/20 rounded-lg max-w-[90px]">
            <span className="text-white text-[11px] font-medium truncate block">
              {selectedPatient.prenom} {selectedPatient.nom}
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <>
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-sky-100 dark:bg-sky-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="bg-slate-100 dark:bg-white/[0.07] rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-700 dark:text-[#94A3B8] leading-relaxed">
                Bonjour ! Je suis votre assistant médical. Posez-moi vos questions sur les interactions, posologies ou pathologies.
                {selectedPatient && (
                  <p className="mt-2 text-sky-600 dark:text-sky-400 font-semibold text-xs">
                    👤 Patient : {selectedPatient.prenom} {selectedPatient.nom}
                  </p>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-600 font-semibold text-center uppercase tracking-wide pt-2">
              Suggestions
            </p>
            <div className="space-y-2">
              {effectiveSuggested.map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="w-full text-left text-xs px-3 py-2.5
                    bg-sky-50 dark:bg-sky-500/[0.08]
                    text-sky-700 dark:text-sky-400
                    rounded-xl hover:bg-sky-100 dark:hover:bg-sky-500/[0.14]
                    transition-colors
                    border border-sky-100 dark:border-sky-500/20
                    font-medium leading-relaxed"
                >
                  {q}
                </button>
              ))}
            </div>
          </>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-sky-500' : 'bg-slate-100 dark:bg-white/[0.07]'
            }`}>
              {msg.role === 'user'
                ? <User className="w-4 h-4 text-white" />
                : <Bot  className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              }
            </div>
            <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-sky-500 text-white rounded-tr-sm'
                : 'bg-slate-100 dark:bg-white/[0.07] text-slate-700 dark:text-[#94A3B8] rounded-tl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <div className="w-8 h-8 bg-slate-100 dark:bg-white/[0.07] rounded-xl flex items-center justify-center flex-shrink-0">
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            </div>
            <div className="bg-slate-100 dark:bg-white/[0.07] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
              {[0, 150, 300].map(d => (
                <div
                  key={d}
                  className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-100 dark:border-white/[0.06] flex-shrink-0">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
            }}
            placeholder="Posez votre question médicale..."
            className="flex-1 px-4 py-2.5
              bg-slate-50 dark:bg-[#1E293B]
              border border-slate-200 dark:border-white/[0.1]
              rounded-xl text-sm
              text-slate-900 dark:text-[#E2E8F0]
              placeholder-slate-400 dark:placeholder-slate-600
              focus:outline-none focus:ring-2 focus:ring-sky-300 dark:focus:ring-sky-500/40
              focus:border-sky-300 dark:focus:border-sky-500/40
              transition-all"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="px-3.5 py-2.5 bg-sky-500 text-white rounded-xl hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-2 text-center">
          Indicatif — ne remplace pas le jugement clinique
        </p>
      </div>
    </motion.div>
  );
}
