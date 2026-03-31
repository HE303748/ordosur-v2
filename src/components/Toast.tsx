import { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top duration-300">
      <div className={`glass-effect rounded-lg shadow-lg p-4 flex items-center space-x-3 min-w-[300px] border-l-4 ${
        type === 'success' ? 'border-safe-500' : 'border-danger-500'
      }`}>
        {type === 'success' ? (
          <CheckCircle className="w-6 h-6 text-safe-500 flex-shrink-0" />
        ) : (
          <XCircle className="w-6 h-6 text-danger-500 flex-shrink-0" />
        )}
        <p className="flex-1 text-sm font-medium text-gray-900">{message}</p>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </div>
  );
}
