import {
  Crown,
  FlaskConical,
  Gamepad2,
  LogOut,
  RefreshCw,
  ScrollText,
  Trophy,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { ConnectionStatus } from '../types/protocol';
import { AudioControlPopover } from './AudioControlPopover';

interface NavbarProps {
  connectionStatus: ConnectionStatus;
  mockMode: boolean;
  activeView: 'game' | 'leaderboard';
  compactArena?: boolean;
  roomCode?: string;
  onToggleMockMode: (enabled: boolean) => void;
  onReconnect: () => void;
  onChangeView: (view: 'game' | 'leaderboard') => void;
  onLeaveRoom?: () => void;
  onToggleMobileDrawer?: () => void;
  logCount?: number;
}

const STATUS_META: Record<
  ConnectionStatus,
  { label: string; dot: string; tone: string }
> = {
  connected: {
    label: 'Terhubung',
    dot: 'bg-[#266D4B]',
    tone: 'text-[#1D5439] bg-[#E6F2EB] border-[#BBDAC8]',
  },
  connecting: {
    label: 'Menghubungkan',
    dot: 'bg-[#C0831F] animate-pulse',
    tone: 'text-[#7D530B] bg-[#FDF3D7] border-[#E7CB82]',
  },
  reconnecting: {
    label: 'Menyambung ulang',
    dot: 'bg-[#C0831F] animate-pulse',
    tone: 'text-[#7D530B] bg-[#FDF3D7] border-[#E7CB82]',
  },
  disconnected: {
    label: 'Terputus',
    dot: 'bg-[#C44B34]',
    tone: 'text-[#8F2F1E] bg-[#FCEBE7] border-[#ECC1B7]',
  },
};

export function Navbar({
  connectionStatus,
  mockMode,
  activeView,
  compactArena = false,
  roomCode,
  onToggleMockMode,
  onReconnect,
  onChangeView,
  onLeaveRoom,
  onToggleMobileDrawer,
  logCount = 0,
}: NavbarProps) {
  const status = STATUS_META[connectionStatus];

  return (
    <header
      className={`shrink-0 z-40 border-b border-[#D5C7B2] bg-[#FFFDF8] ${
        compactArena ? 'h-11 sm:h-12' : 'sticky top-0'
      }`}
    >
      <div
        className={`mx-auto flex h-full max-w-[1440px] items-center justify-between gap-2 px-3 sm:px-5 ${
          compactArena ? 'py-1' : 'py-2.5'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => onChangeView('game')}
            className="flex items-center gap-2 text-left group cursor-pointer shrink-0"
          >
            <span
              className={`flex items-center justify-center rounded-lg border border-[#8A2E1D] bg-[#C44B34] text-[#FFFDF8] shadow-[0_2px_0_0_#8A2E1D] group-hover:bg-[#B2412B] transition-colors ${
                compactArena ? 'h-7 w-7' : 'h-8.5 w-8.5'
              }`}
            >
              <Crown className={compactArena ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
            </span>
            <span className="font-display text-base font-extrabold tracking-tight text-[#1F1A15] sm:text-lg">
              ULTA
            </span>
          </button>

          {roomCode && (
            <span className="rounded-md border border-[#E5C068] bg-[#FDF3D7] px-2 py-0.5 font-code text-[11px] font-bold text-[#7D530B]">
              {roomCode}
            </span>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Switch Live WS / Mock (disembunyikan di mobile arena agar top bar super ringkas) */}
          <div
            className={`${
              compactArena ? 'hidden md:inline-flex' : 'inline-flex'
            } items-center rounded-lg border border-[#D5C7B2] bg-[#EFE6D6] p-0.5 text-xs font-semibold`}
            role="group"
            aria-label="Mode koneksi"
          >
            <button
              type="button"
              onClick={() => onToggleMockMode(false)}
              className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors cursor-pointer ${
                !mockMode
                  ? 'bg-[#FFFDF8] text-[#1F1A15] shadow-[0_1px_0_0_#D5C7B2]'
                  : 'text-[#605549] hover:text-[#1F1A15]'
              }`}
              title="WebSocket Bridge VPS"
            >
              <Wifi className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Live WS</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleMockMode(true)}
              className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors cursor-pointer ${
                mockMode
                  ? 'bg-[#2A1E15] text-[#FFFDF8]'
                  : 'text-[#605549] hover:text-[#1F1A15]'
              }`}
              title="Simulasi lokal ULTA/1.0"
            >
              <FlaskConical className="h-3.5 w-3.5" />
              <span>Mock</span>
            </button>
          </div>

          {/* Kontrol Audio (Mute cepat + Popover BGM/SFX) */}
          <AudioControlPopover compact={compactArena} />

          {/* Status Koneksi */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold ${status.tone}`}
            title={`Status koneksi: ${status.label}`}
          >
            <span className={`h-2 w-2 rounded-full ${status.dot}`} />
            <span className="hidden sm:inline">{status.label}</span>
            {connectionStatus === 'disconnected' && (
              <WifiOff className="h-3 w-3 sm:hidden" />
            )}
          </span>

          {/* Reconnect */}
          <button
            type="button"
            onClick={onReconnect}
            title="Sambungkan ulang"
            aria-label="Sambungkan ulang"
            className="btn-tactile inline-flex items-center gap-1 rounded-lg border border-[#D5C7B2] bg-[#FFFDF8] px-2 py-1 text-xs font-semibold text-[#1F1A15] hover:bg-[#EFE6D6] cursor-pointer"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                connectionStatus === 'connecting' ||
                connectionStatus === 'reconnecting'
                  ? 'animate-spin text-[#B7791F]'
                  : 'text-[#605549]'
              }`}
            />
            <span className={compactArena ? 'hidden xl:inline' : 'hidden md:inline'}>
              Reconnect
            </span>
          </button>

          {/* Mobile Arena: tombol buka Log & Daftar Pemain */}
          {compactArena && onToggleMobileDrawer && (
            <button
              type="button"
              onClick={onToggleMobileDrawer}
              className="btn-tactile lg:hidden inline-flex items-center gap-1 rounded-lg border border-[#D5C7B2] bg-[#EFE6D6] px-2 py-1 text-xs font-bold text-[#1F1A15] cursor-pointer"
              aria-label="Buka posisi pemain dan log kejadian"
            >
              <ScrollText className="h-3.5 w-3.5 text-[#605549]" />
              <span className="font-code text-[11px]">{logCount}</span>
            </button>
          )}

          {/* Leaderboard Nav (disembunyikan di mobile arena agar hemat ruang) */}
          <button
            type="button"
            onClick={() =>
              onChangeView(activeView === 'game' ? 'leaderboard' : 'game')
            }
            className={`btn-tactile ${
              compactArena ? 'hidden sm:inline-flex' : 'inline-flex'
            } items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold cursor-pointer ${
              activeView === 'leaderboard'
                ? 'border-[#1F1A15] bg-[#1F1A15] text-[#FFFDF8]'
                : 'border-[#D5C7B2] bg-[#FFFDF8] text-[#1F1A15] hover:bg-[#EFE6D6]'
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
                <span className="hidden md:inline">Leaderboard</span>
              </>
            )}
          </button>

          {/* Keluar Room langsung di top bar Arena */}
          {compactArena && onLeaveRoom && (
            <button
              type="button"
              onClick={onLeaveRoom}
              title="Keluar dari room"
              aria-label="Keluar dari room"
              className="btn-tactile inline-flex items-center gap-1 rounded-lg border border-[#ECC1B7] bg-[#FCEBE7] px-2 py-1 text-xs font-bold text-[#8F2F1E] hover:bg-[#F7DAD3] cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
