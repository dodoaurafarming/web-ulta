import {
  Crown,
  FlaskConical,
  Gamepad2,
  RefreshCw,
  Trophy,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { ConnectionStatus } from '../types/protocol';

interface NavbarProps {
  connectionStatus: ConnectionStatus;
  mockMode: boolean;
  activeView: 'game' | 'leaderboard';
  roomCode?: string;
  onToggleMockMode: (enabled: boolean) => void;
  onReconnect: () => void;
  onChangeView: (view: 'game' | 'leaderboard') => void;
}

const STATUS_STYLE: Record<
  ConnectionStatus,
  { label: string; dot: string; badge: string }
> = {
  connected: {
    label: 'Connected',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  connecting: {
    label: 'Connecting',
    dot: 'bg-amber-400 animate-pulse',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  reconnecting: {
    label: 'Reconnecting',
    dot: 'bg-amber-500 animate-ping',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  disconnected: {
    label: 'Disconnected',
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-800 border-rose-200',
  },
};

export function Navbar({
  connectionStatus,
  mockMode,
  activeView,
  roomCode,
  onToggleMockMode,
  onReconnect,
  onChangeView,
}: NavbarProps) {
  const statusMeta = STATUS_STYLE[connectionStatus];

  return (
    <header className="sticky top-0 z-40 border-b-2 border-amber-200/80 bg-white/90 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2.5 px-3 py-2.5 sm:px-6">
        {/* Brand */}
        <button
          type="button"
          onClick={() => onChangeView('game')}
          className="flex items-center gap-2.5 text-left group cursor-pointer"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white shadow-md shadow-orange-500/25 ring-2 ring-amber-200 group-hover:scale-105 transition-transform">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display text-lg font-bold leading-none text-slate-900">
                ULTA
              </span>
              <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 font-code text-[10px] font-bold text-indigo-700">
                1.0
              </span>
              {roomCode && (
                <span className="hidden sm:inline-block rounded-md bg-amber-100 px-1.5 py-0.5 font-code text-[10px] font-bold text-amber-800">
                  #{roomCode}
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium text-slate-500 leading-tight">
              Ular Tangga Multiplayer
            </p>
          </div>
        </button>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Switch Mock Mode vs Live WebSocket */}
          <div
            className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold"
            role="group"
            aria-label="Mode koneksi"
          >
            <button
              type="button"
              onClick={() => onToggleMockMode(false)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                !mockMode
                  ? 'bg-white text-sky-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Terhubung ke WebSocket Bridge VPS"
            >
              <Wifi className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Live WS</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleMockMode(true)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                mockMode
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Simulasi lokal ULTA/1.0 tanpa server VPS"
            >
              <FlaskConical className="h-3.5 w-3.5" />
              <span>Mock</span>
            </button>
          </div>

          {/* Connection Status Pill + Reconnect */}
          <div className="flex items-center gap-1">
            <span
              className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold ${statusMeta.badge}`}
            >
              <span className={`h-2 w-2 rounded-full ${statusMeta.dot}`} />
              <span className="hidden xs:inline sm:inline">{statusMeta.label}</span>
              {connectionStatus === 'disconnected' && (
                <WifiOff className="h-3 w-3 sm:hidden" />
              )}
            </span>
            <button
              type="button"
              onClick={onReconnect}
              title="Hubungkan ulang (Reconnect)"
              aria-label="Reconnect ke server"
              className="btn-tactile inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm hover:border-amber-300 hover:bg-amber-50 cursor-pointer"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  connectionStatus === 'connecting' ||
                  connectionStatus === 'reconnecting'
                    ? 'animate-spin text-amber-600'
                    : ''
                }`}
              />
              <span className="hidden md:inline">Reconnect</span>
            </button>
          </div>

          {/* Navigation: Game vs Leaderboard placeholder */}
          <button
            type="button"
            onClick={() =>
              onChangeView(activeView === 'game' ? 'leaderboard' : 'game')
            }
            className={`btn-tactile inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold shadow-sm cursor-pointer ${
              activeView === 'leaderboard'
                ? 'border-amber-400 bg-amber-400 text-slate-900'
                : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            {activeView === 'leaderboard' ? (
              <>
                <Gamepad2 className="h-3.5 w-3.5" />
                <span>Kembali ke Game</span>
              </>
            ) : (
              <>
                <Trophy className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Leaderboard & Riwayat</span>
                <span className="sm:hidden">Ranking</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
