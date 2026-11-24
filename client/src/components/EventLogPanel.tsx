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
  embedded?: boolean;
}

const LOG_STYLE: Record<
  LogCategory,
  { icon: typeof Info; badge: string }
> = {
  system: { icon: Info, badge: 'bg-[#EFE6D6] text-[#605549]' },
  room: { icon: Users, badge: 'bg-[#EAF2FB] text-[#1E4B7A]' },
  turn: { icon: Dices, badge: 'bg-[#FDF3D7] text-[#8A580F]' },
  move: { icon: Footprints, badge: 'bg-[#E6F2EB] text-[#1D5439]' },
  quiz: { icon: Brain, badge: 'bg-[#F3ECF7] text-[#543166]' },
  status: { icon: WifiOff, badge: 'bg-[#FCEBE7] text-[#8F2F1E]' },
  error: { icon: AlertCircle, badge: 'bg-[#FCEBE7] text-[#8F2F1E]' },
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

export function EventLogPanel({ logs, embedded = false }: EventLogPanelProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logs]);

  return (
    <div
      className={
        embedded
          ? 'flex flex-1 min-h-0 flex-col px-4 py-3'
          : 'studio-panel flex flex-col rounded-2xl p-4'
      }
    >
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ScrollText className="h-3.5 w-3.5 text-[#605549]" />
          <h3 className="font-display text-sm font-bold text-[#1F1A15]">
            Catatan permainan
          </h3>
        </div>
        <span className="font-code text-[10px] font-bold text-[#7A6F62]">
          {logs.length}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="tabletop-scroll flex-1 min-h-0 space-y-1.5 overflow-y-auto pr-1"
      >
        {logs.length === 0 ? (
          <p className="py-4 text-center text-xs font-medium text-[#8A7F72]">
            Belum ada aktivitas.
          </p>
        ) : (
          logs.map((entry) => {
            const meta = LOG_STYLE[entry.category];
            const Icon = meta.icon;
            return (
              <div
                key={entry.id}
                className="flex items-start gap-2 rounded-lg bg-[#F7F1E5] px-2.5 py-1.5 text-xs"
              >
                <span
                  className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded ${meta.badge}`}
                >
                  <Icon className="h-3 w-3" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[#1F1A15] leading-snug">
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
    </div>
  );
}
