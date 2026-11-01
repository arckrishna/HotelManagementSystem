import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastFunctions {
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

interface ToastContextType {
  toast: ToastFunctions;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string, title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, title, duration: 4000 }]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const toast: ToastFunctions = {
    success: (message: string, title?: string) => addToast('success', message, title || 'Success'),
    error: (message: string, title?: string) => addToast('error', message, title || 'Error Notice'),
    info: (message: string, title?: string) => addToast('info', message, title || 'Information'),
    warning: (message: string, title?: string) => addToast('warning', message, title || 'Attention Required'),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start space-x-3 p-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${
              t.type === 'success'
                ? 'bg-slate-900/95 text-white border-emerald-500/40'
                : t.type === 'error'
                ? 'bg-slate-900/95 text-white border-rose-500/40'
                : t.type === 'warning'
                ? 'bg-slate-900/95 text-white border-amber-500/40'
                : 'bg-slate-900/95 text-white border-blue-500/40'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
              {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-blue-400" />}
            </div>

            <div className="flex-1 min-w-0">
              {t.title && <p className="text-xs font-bold uppercase tracking-wider mb-0.5 text-slate-200">{t.title}</p>}
              <p className="text-xs text-slate-300 leading-relaxed">{t.message}</p>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="flex-shrink-0 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return {
    toast: context.toast,
    success: context.toast.success,
    error: context.toast.error,
    info: context.toast.info,
    warning: context.toast.warning,
  };
};
