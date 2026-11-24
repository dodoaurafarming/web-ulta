import { useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';
import type { ToastItem, ToastSeverity } from '../types/protocol';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const TOAST_STYLES: Record<
  ToastSeverity,
  { container: string; icon: typeof Info; iconColor: string }
> = {
  info: {
    container: 'border-sky-300 bg-sky-50/95 text-sky-950',
    icon: Info,
    iconColor: 'text-sky-600',
  },
  success: {
    container: 'border-emerald-300 bg-emerald-50/95 text-emerald-950',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
  },
  warning: {
    container: 'border-amber-300 bg-amber-50/95 text-amber-950',
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
  },
  error: {
    container: 'border-rose-300 bg-rose-50/95 text-rose-950',
    icon: AlertCircle,
    iconColor: 'text-rose-600',
  },
};

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 6_000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const style = TOAST_STYLES[toast.severity];
  const Icon = style.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`animate-toast-enter pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border-2 p-3.5 shadow-lg backdrop-blur-md ${style.container}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconColor}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-extrabold tracking-tight">{toast.title}</p>
          {toast.code !== undefined && (
            <span className="rounded-md bg-rose-200/80 px-1.5 py-0.5 font-code text-[10px] font-bold text-rose-900">
              {toast.code}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs font-medium opacity-90 leading-relaxed">
          {toast.message}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Tutup notifikasi"
        className="rounded-lg p-1 opacity-60 hover:bg-black/5 hover:opacity-100 cursor-pointer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-3 top-18 z-50 flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-2 sm:right-5">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
