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
  { border: string; iconWrap: string; icon: typeof Info; codeBadge: string }
> = {
  info: {
    border: 'border-[#B6CFE6]',
    iconWrap: 'bg-[#EAF2FB] text-[#1E4B7A]',
    icon: Info,
    codeBadge: 'bg-[#EAF2FB] text-[#1E4B7A]',
  },
  success: {
    border: 'border-[#BBDAC8]',
    iconWrap: 'bg-[#E6F2EB] text-[#1D5439]',
    icon: CheckCircle2,
    codeBadge: 'bg-[#E6F2EB] text-[#1D5439]',
  },
  warning: {
    border: 'border-[#E7CB82]',
    iconWrap: 'bg-[#FDF3D7] text-[#7D530B]',
    icon: AlertTriangle,
    codeBadge: 'bg-[#FDF3D7] text-[#7D530B]',
  },
  error: {
    border: 'border-[#E7B5A9]',
    iconWrap: 'bg-[#FCEBE7] text-[#8F2F1E]',
    icon: AlertCircle,
    codeBadge: 'bg-[#FCEBE7] text-[#8F2F1E]',
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
    }, 5_500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const style = TOAST_STYLES[toast.severity];
  const Icon = style.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`animate-popup-in pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border-[1.5px] bg-[#FFFDF8] p-3 text-[#1F1A15] shadow-[0_4px_14px_-4px_rgba(42,30,21,0.22)] ${style.border}`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${style.iconWrap}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-bold leading-snug">{toast.title}</p>
          {toast.code !== undefined && (
            <span
              className={`rounded px-1.5 py-0.5 font-code text-[10px] font-bold ${style.codeBadge}`}
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
        className="rounded-md p-1 text-[#786D60] hover:bg-[#EFE6D6] hover:text-[#1F1A15] cursor-pointer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-3 top-14 z-50 flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-2 sm:right-5">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
