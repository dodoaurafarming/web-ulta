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
  system: { icon: Info, badge: 'bg-[#F3ECE0] text-[#645A4E]' },
  room: { icon: Users, badge: 'bg-[#EAF2FB] text-[#1E4B7A]' },
  turn: { icon: Dices, badge: 'bg-[#FDF3D7] text-[#8C5B12]' },
  move: { icon: Footprints, badge: 'bg-[#E6F2EB] text-[#1F5C40]' },
  quiz: { icon: Brain, badge: 'bg-[#F3ECF7] text-[#543166]' },
  status: { icon: WifiOff, badge: 'bg-[#FCEBE7] text-[#963826]' },
  error: { icon: AlertCircle, badge: 'bg-[#FCEBE7] text-[#963826]' },
  gameover: { icon: Trophy, badge: 'bg-[#FDF3D7] text-[#7D530B]' },
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
    <section className="surface-card rounded-2xl p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-[#645A4E]" />
          <h3 className="font-display text-sm font-bold text-[#1F1B17]">
            Log Kejadian
          </h3>
        </div>
        <span className="font-code text-[10px] font-bold text-[#645A4E]">
          {logs.length} entri
        </span>
      </div>

      <div
        ref={scrollRef}
        className="max-h-52 space-y-1.5 overflow-y-auto pr-1 sm:max-h-56"
      >
        {logs.length === 0 ? (
          <p className="py-5 text-center text-xs font-medium text-[#8A7F72]">
            Belum ada aktivitas permainan.
          </p>
        ) : (
          logs.map((entry) => {
            const meta = LOG_STYLE[entry.category];
            const Icon = meta.icon;
            return (
              <div
                key={entry.id}
                className="flex items-start gap-2 rounded-lg border border-[#EDE5D7] bg-[#FAF6EE]/80 px-2.5 py-2 text-xs"
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded ${meta.badge}`}
                >
                  <Icon className="h-3 w-3" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[#1F1B17] leading-snug">
                    {entry.message}
                  </p>
                  <span className="font-code text-[10px] text-[#8A7F72]">
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
