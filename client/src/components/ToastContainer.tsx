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
  { accentBar: string; icon: typeof Info; iconColor: string; badge: string }
> = {
  info: {
    accentBar: 'border-l-[#2B6CB0]',
    icon: Info,
    iconColor: 'text-[#2B6CB0]',
    badge: 'bg-[#EAF2FB] text-[#1E4B7A]',
  },
  success: {
    accentBar: 'border-l-[#2F7D57]',
    icon: CheckCircle2,
    iconColor: 'text-[#2F7D57]',
    badge: 'bg-[#E6F2EB] text-[#1D5439]',
  },
  warning: {
    accentBar: 'border-l-[#C4881A]',
    icon: AlertTriangle,
    iconColor: 'text-[#B7791F]',
    badge: 'bg-[#FDF3D7] text-[#7D530B]',
  },
  error: {
    accentBar: 'border-l-[#C8523B]',
    icon: AlertCircle,
    iconColor: 'text-[#C8523B]',
    badge: 'bg-[#FCEBE7] text-[#8F2F1E]',
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
      className={`animate-toast-enter pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border-[1.5px] border-[#DDD2C0] border-l-4 bg-[#FFFDF8] p-3.5 text-[#1F1B17] shadow-[0_4px_0_0_rgba(44,38,33,0.12)] ${style.accentBar}`}
    >
      <Icon className={`mt-0.5 h-4.5 w-4.5 shrink-0 ${style.iconColor}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-bold tracking-tight">{toast.title}</p>
          {toast.code !== undefined && (
            <span
              className={`rounded px-1.5 py-0.5 font-code text-[10px] font-bold ${style.badge}`}
            >
              {toast.code}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs font-medium text-[#5A5045] leading-relaxed">
          {toast.message}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Tutup notifikasi"
        className="rounded-md p-1 text-[#786D60] hover:bg-[#F3ECE0] hover:text-[#1F1B17] cursor-pointer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-3 top-17 z-50 flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-2 sm:right-5">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
