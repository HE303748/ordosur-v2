import { useEffect } from 'react';
import { CheckCircle2, XCircle, X, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const config = {
    success: { icon: CheckCircle2, bg: 'bg-emerald-500', bar: 'bg-emerald-400' },
    error:   { icon: XCircle,      bg: 'bg-red-500',     bar: 'bg-red-400'     },
    info:    { icon: Info,          bg: 'bg-[#00A86B]',     bar: 'bg-[#00A86B]'     },
    warning: { icon: AlertTriangle, bg: 'bg-amber-500',   bar: 'bg-amber-400'   },
  }[type];

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0,   scale: 1      }}
      exit={{    opacity: 0, y: -12, scale: 0.95   }}
      transition={{ type: 'spring', damping: 25, stiffness: 400 }}
      className="fixed top-4 right-4 z-[9999] min-w-[320px] max-w-[420px]"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden">
        <div className={`h-1 w-full ${config.bar}`} />
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className={`w-8 h-8 ${config.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <p className="flex-1 text-sm font-semibold text-slate-800">{message}</p>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* Ã¢â€â‚¬Ã¢â€â‚¬ Toast manager (multi-toast support) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface ToastManagerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

export function ToastManager({ toasts, onRemove }: ToastManagerProps) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => onRemove(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}
