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
    dot: 'bg-[#2F7D57]',
    badge: 'bg-[#E6F2EB] text-[#1D5439] border-[#BBDAC8]',
  },
  connecting: {
    label: 'Connecting',
    dot: 'bg-[#C4881A] animate-pulse',
    badge: 'bg-[#FDF3D7] text-[#7D530B] border-[#E7CB82]',
  },
  reconnecting: {
    label: 'Reconnecting',
    dot: 'bg-[#C4881A] animate-pulse',
    badge: 'bg-[#FDF3D7] text-[#7D530B] border-[#E7CB82]',
  },
  disconnected: {
    label: 'Disconnected',
    dot: 'bg-[#C8523B]',
    badge: 'bg-[#FCEBE7] text-[#8F2F1E] border-[#ECC1B7]',
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
    <header className="sticky top-0 z-40 border-b-[1.5px] border-[#DDD2C0] bg-[#FFFDF8]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2.5 px-3 py-2.5 sm:px-6">
        {/* Brand Emblem */}
        <button
          type="button"
          onClick={() => onChangeView('game')}
          className="flex items-center gap-2.5 text-left group cursor-pointer"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border-[1.5px] border-[#963826] bg-[#C8523B] text-[#FFFDF8] shadow-[0_2px_0_0_#963826] group-hover:bg-[#B84731] transition-colors">
            <Crown className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display text-lg font-extrabold leading-none text-[#1F1B17]">
                ULTA
              </span>
              <span className="rounded border border-[#D9CEBC] bg-[#F3ECE0] px-1.5 py-0.5 font-code text-[10px] font-bold text-[#645A4E]">
                1.0
              </span>
              {roomCode && (
                <span className="hidden sm:inline-block rounded border border-[#E5C068] bg-[#FDF3D7] px-1.5 py-0.5 font-code text-[10px] font-bold text-[#7D530B]">
                  {roomCode}
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium text-[#645A4E] leading-tight">
              Ular Tangga Tabletop
            </p>
          </div>
        </button>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switch: Live WS vs Mock */}
          <div
            className="inline-flex items-center rounded-lg border border-[#D9CEBC] bg-[#F3ECE0] p-0.5 text-xs font-semibold"
            role="group"
            aria-label="Mode koneksi"
          >
            <button
              type="button"
              onClick={() => onToggleMockMode(false)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors cursor-pointer ${
                !mockMode
                  ? 'bg-[#FFFDF8] text-[#1F1B17] shadow-[0_1px_0_0_#D9CEBC]'
                  : 'text-[#645A4E] hover:text-[#1F1B17]'
              }`}
              title="Terhubung ke WebSocket Bridge VPS"
            >
              <Wifi className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Live WS</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleMockMode(true)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors cursor-pointer ${
                mockMode
                  ? 'bg-[#2C2621] text-[#FFFDF8]'
                  : 'text-[#645A4E] hover:text-[#1F1B17]'
              }`}
              title="Simulasi lokal ULTA/1.0 tanpa server VPS"
            >
              <FlaskConical className="h-3.5 w-3.5" />
              <span>Mock</span>
            </button>
          </div>

          {/* Connection Status + Reconnect */}
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${statusMeta.badge}`}
            >
              <span className={`h-2 w-2 rounded-full ${statusMeta.dot}`} />
              <span className="hidden sm:inline">{statusMeta.label}</span>
              {connectionStatus === 'disconnected' && (
                <WifiOff className="h-3 w-3 sm:hidden" />
              )}
            </span>
            <button
              type="button"
              onClick={onReconnect}
              title="Hubungkan ulang (Reconnect)"
              aria-label="Reconnect ke server"
              className="btn-tactile inline-flex items-center gap-1 rounded-lg border border-[#D9CEBC] bg-[#FFFDF8] px-2.5 py-1 text-xs font-semibold text-[#1F1B17] shadow-[0_2px_0_0_#E2D7C4] hover:bg-[#F3ECE0] cursor-pointer"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  connectionStatus === 'connecting' ||
                  connectionStatus === 'reconnecting'
                    ? 'animate-spin text-[#B7791F]'
                    : 'text-[#645A4E]'
                }`}
              />
              <span className="hidden md:inline">Reconnect</span>
            </button>
          </div>

          {/* Leaderboard & History Navigation */}
          <button
            type="button"
            onClick={() =>
              onChangeView(activeView === 'game' ? 'leaderboard' : 'game')
            }
            className={`btn-tactile inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold cursor-pointer ${
              activeView === 'leaderboard'
                ? 'border-[#1F1B17] bg-[#1F1B17] text-[#FFFDF8]'
                : 'border-[#D9CEBC] bg-[#FFFDF8] text-[#1F1B17] shadow-[0_2px_0_0_#E2D7C4] hover:bg-[#F3ECE0]'
            }`}
          >
            {activeView === 'leaderboard' ? (
              <>
                <Gamepad2 className="h-3.5 w-3.5" />
                <span>Kembali ke Game</span>
              </>
            ) : (
              <>
                <Trophy className="h-3.5 w-3.5 text-[#B7791F]" />
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
