import { useEffect, useRef } from 'react';
import {
  AlertCircle,
  Brain,
  Dices,
  Footprints,
  Info,
  ScrollText,
  Trophy,
  Users,
  WifiOff,
} from 'lucide-react';
import type { GameLogEntry, LogCategory } from '../types/protocol';

interface EventLogPanelProps {
  logs: GameLogEntry[];
}

const LOG_STYLE: Record<
  LogCategory,
  { icon: typeof Info; badge: string }
> = {
  system: { icon: Info, badge: 'bg-slate-100 text-slate-600' },
  room: { icon: Users, badge: 'bg-indigo-100 text-indigo-700' },
  turn: { icon: Dices, badge: 'bg-amber-100 text-amber-700' },
  move: { icon: Footprints, badge: 'bg-emerald-100 text-emerald-700' },
  quiz: { icon: Brain, badge: 'bg-violet-100 text-violet-700' },
  status: { icon: WifiOff, badge: 'bg-orange-100 text-orange-700' },
  error: { icon: AlertCircle, badge: 'bg-rose-100 text-rose-700' },
  gameover: { icon: Trophy, badge: 'bg-yellow-100 text-yellow-800' },
};

function formatTime(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function EventLogPanel({ logs }: EventLogPanelProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logs]);

  return (
    <section className="rounded-3xl border-2 border-slate-200 bg-white/95 p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-indigo-600" />
          <h3 className="font-display text-base font-bold text-slate-900">
            Log Kejadian Real-Time
          </h3>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
          {logs.length} entri
        </span>
      </div>

      <div
        ref={scrollRef}
        className="max-h-56 space-y-2 overflow-y-auto pr-1 sm:max-h-64"
      >
        {logs.length === 0 ? (
          <p className="py-6 text-center text-xs font-medium text-slate-400">
            Belum ada aktivitas permainan.
          </p>
        ) : (
          logs.map((entry) => {
            const meta = LOG_STYLE[entry.category];
            const Icon = meta.icon;
            return (
              <div
                key={entry.id}
                className="flex items-start gap-2 rounded-xl bg-slate-50/80 p-2 text-xs border border-slate-100"
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg ${meta.badge}`}
                >
                  <Icon className="h-3 w-3" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800 leading-snug">
                    {entry.message}
                  </p>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {formatTime(entry.timestamp)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
