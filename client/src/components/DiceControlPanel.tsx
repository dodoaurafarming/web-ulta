import { useEffect, useState } from 'react';
import { Clock, Dices, Sparkles, WifiOff } from 'lucide-react';
import type { ActiveTurnState } from '../store/gameStore';
import type { MoveEvent, RoomPlayer } from '../types/protocol';
import { getPlayerPalette } from '../utils/boardGeometry';

const PIP_POSITIONS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export function DiceCube({
  value,
  rolling,
  size = 'md',
}: {
  value: number;
  rolling: boolean;
  size?: 'sm' | 'md';
}) {
  const safeVal = Math.max(1, Math.min(6, value));
  const pips = PIP_POSITIONS[safeVal] ?? PIP_POSITIONS[1];
  const isSm = size === 'sm';

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center rounded-xl border-2 border-[#BFA98B] bg-[#FFFDF8] ${
        isSm
          ? 'h-11 w-11 p-1.5 shadow-[0_3px_0_0_#A69072]'
          : 'h-16 w-16 p-2.5 shadow-[0_4px_0_0_#A69072,0_8px_14px_-6px_rgba(42,30,21,0.3)]'
      } ${rolling ? 'animate-dice-tumble' : ''}`}
      aria-label={`Dadu angka ${safeVal}`}
    >
      <div className="grid h-full w-full grid-cols-3 grid-rows-3 place-items-center gap-0.5">
        {Array.from({ length: 9 }).map((_, idx) => (
          <span
            key={idx}
            className={`rounded-full ${isSm ? 'h-1.5 w-1.5' : 'h-2.5 w-2.5'} ${
              pips.includes(idx)
                ? safeVal === 6
                  ? 'bg-[#C44B34]'
                  : 'bg-[#1F1A15]'
                : 'bg-transparent'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function useTurnCountdown(currentTurn: ActiveTurnState | null): {
  remainingSec: number;
  progressPct: number;
  isUrgent: boolean;
} {
  const [remainingSec, setRemainingSec] = useState<number>(
    currentTurn?.deadline ?? 10,
  );

  useEffect(() => {
    if (!currentTurn) {
      setRemainingSec(0);
      return;
    }

    const updateTimer = () => {
      const elapsedSec = (Date.now() - currentTurn.startedAt) / 1000;
      setRemainingSec(Math.max(0, currentTurn.deadline - elapsedSec));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [currentTurn]);

  const deadline = currentTurn?.deadline ?? 10;
  const progressPct =
    deadline > 0 ? Math.max(0, Math.min(100, (remainingSec / deadline) * 100)) : 0;
  const isUrgent = remainingSec <= 3 && remainingSec > 0;

  return { remainingSec, progressPct, isUrgent };
}

interface DiceCommandProps {
  players: RoomPlayer[];
  positions: Record<string, number>;
  currentTurn: ActiveTurnState | null;
  myPlayerId: string | null;
  canRoll: boolean;
  isDiceRolling: boolean;
  displayedDice: number;
  displayedMove: MoveEvent | null;
  hasActiveQuestion: boolean;
  isAnimating: boolean;
  onRollDice: () => void;
}

/** Bagian kontrol Giliran + Dadu + Tombol Lempar Dadu untuk Desktop Command Dock */
export function DesktopDiceSection({
  players,
  currentTurn,
  myPlayerId,
  canRoll,
  isDiceRolling,
  displayedDice,
  displayedMove,
  hasActiveQuestion,
  isAnimating,
  onRollDice,
}: DiceCommandProps) {
  const { remainingSec, progressPct, isUrgent } = useTurnCountdown(currentTurn);
  const activePlayer = players.find(
    (p) => p.playerId === currentTurn?.playerId,
  );
  const activePalette = activePlayer
    ? getPlayerPalette(activePlayer.colorIndex)
    : null;
  const isMyTurn = Boolean(myPlayerId && activePlayer?.playerId === myPlayerId);

  return (
    <div className="p-4 border-b border-[#DDD1BE]">
      {/* Info Giliran + Timer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {activePalette && (
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold text-[#FFFDF8] ${activePalette.bg}`}
            >
              {activePlayer?.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-display text-base font-extrabold text-[#1F1A15] leading-tight">
              {activePlayer
                ? isMyTurn
                  ? 'Giliran kamu'
                  : `Giliran ${activePlayer.name}`
                : 'Menyiapkan giliran...'}
            </p>
            <p className="text-[11px] font-medium text-[#605549]">
              {isAnimating
                ? 'Memutar animasi papan...'
                : isMyTurn
                  ? 'Tekan tombol untuk melempar dadu'
                  : 'Menunggu langkah lawan'}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 font-code text-xs font-bold ${
            isUrgent
              ? 'border-[#E7B5A9] bg-[#FCEBE7] text-[#8F2F1E]'
              : 'border-[#E5C068] bg-[#FDF3D7] text-[#7D530B]'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>{Math.ceil(remainingSec)}d</span>
        </span>
      </div>

      {/* Countdown bar */}
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[#E8DEC9]">
        <div
          style={{ width: `${progressPct}%` }}
          className={`h-full rounded-full transition-all duration-100 ${
            isUrgent ? 'bg-[#C44B34]' : 'bg-[#266D4B]'
          }`}
        />
      </div>

      {/* Baki Dadu + Tombol Fisik Lempar Dadu */}
      <div className="studio-tray mt-3 flex items-center justify-between gap-3 rounded-xl p-3">
        <div className="flex items-center gap-3 min-w-0">
          <DiceCube value={displayedDice} rolling={isDiceRolling} />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#605549]">
              {isDiceRolling ? 'Mengocok dadu...' : 'Dadu terakhir'}
            </p>
            <p className="font-display text-2xl font-extrabold text-[#1F1A15] leading-none mt-0.5">
              {isDiceRolling ? '—' : displayedMove ? displayedDice : 'Siap'}
            </p>
            {!isDiceRolling && displayedMove?.dice === 6 && (
              <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[#C44B34]">
                <Sparkles className="h-3 w-3" />
                Bonus giliran
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onRollDice}
        disabled={!canRoll}
        className="btn-chunky mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#8A2E1D] bg-[#C44B34] px-4 py-3 font-display text-base font-extrabold tracking-wide text-[#FFFDF8] shadow-[0_4px_0_0_#8A2E1D] hover:bg-[#B2412B] cursor-pointer disabled:cursor-not-allowed disabled:border-[#D5C7B2] disabled:bg-[#EAE1D1] disabled:text-[#8E8274] disabled:shadow-none"
      >
        <Dices className="h-5 w-5" />
        <span>
          {hasActiveQuestion
            ? 'Kuis sedang aktif'
            : isDiceRolling
              ? 'Mengocok dadu...'
              : canRoll
                ? 'LEMPAR DADU'
                : isAnimating
                  ? 'Memproses langkah...'
                  : 'Menunggu giliran'}
        </span>
      </button>
    </div>
  );
}

/** Daftar posisi pemain ringkas di dalam Desktop Command Dock */
export function PlayerStandingsSection({
  players,
  positions,
  currentTurnPlayerId,
  myPlayerId,
}: {
  players: RoomPlayer[];
  positions: Record<string, number>;
  currentTurnPlayerId: string | null;
  myPlayerId: string | null;
}) {
  return (
    <div className="px-4 py-3 border-b border-[#DDD1BE]">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-[#1F1A15]">
          Pemain
        </h3>
        <span className="text-[11px] font-medium text-[#605549]">
          Target petak 100
        </span>
      </div>

      <div className="space-y-1.5">
        {players.map((player) => {
          const pos = positions[player.playerId] ?? player.position ?? 1;
          const palette = getPlayerPalette(player.colorIndex);
          const isTurn = player.playerId === currentTurnPlayerId;
          const isMe = player.playerId === myPlayerId;

          return (
            <div
              key={player.playerId}
              className={`rounded-lg px-2.5 py-1.5 transition-colors ${
                isTurn ? 'bg-[#F5E9D6]' : 'bg-transparent'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-[#FFFDF8] ${palette.bg}`}
                  >
                    {player.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="truncate font-semibold text-[#1F1A15]">
                    {player.name}
                    {isMe ? ' (Kamu)' : ''}
                  </span>
                  {!player.online && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#8F2F1E]">
                      <WifiOff className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <span className="font-code text-xs font-bold text-[#5A5045]">
                  {pos}/100
                </span>
              </div>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[#E5DAC7]">
                <div
                  style={{ width: `${pos}%` }}
                  className={`h-full rounded-full transition-all duration-300 ${palette.bg}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Sticky Bottom Command Dock untuk layar Mobile (< 1024px) — 0 scroll! */
export function MobileBottomCommandDock({
  players,
  currentTurn,
  myPlayerId,
  canRoll,
  isDiceRolling,
  displayedDice,
  hasActiveQuestion,
  isAnimating,
  onRollDice,
}: Omit<DiceCommandProps, 'positions' | 'displayedMove'>) {
  const { remainingSec, progressPct, isUrgent } = useTurnCountdown(currentTurn);
  const activePlayer = players.find(
    (p) => p.playerId === currentTurn?.playerId,
  );
  const isMyTurn = Boolean(myPlayerId && activePlayer?.playerId === myPlayerId);

  return (
    <div
      data-mobile-dock
      className="lg:hidden shrink-0 border-t-2 border-[#3A281A] bg-[#241A12] px-3 py-2.5 text-[#FAF6EE]"
    >
      {/* Slim turn timer bar across dock top */}
      <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-[#3D2E22]">
        <div
          style={{ width: `${progressPct}%` }}
          className={`h-full rounded-full transition-all duration-100 ${
            isUrgent ? 'bg-[#E56B55]' : 'bg-[#4EA076]'
          }`}
        />
      </div>

      <div className="flex items-center justify-between gap-2.5">
        {/* Left: Mini Die + Turn Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <DiceCube value={displayedDice} rolling={isDiceRolling} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-extrabold leading-tight text-[#FFFDF8]">
              {activePlayer
                ? isMyTurn
                  ? 'Giliran kamu!'
                  : `Giliran ${activePlayer.name}`
                : 'Menunggu...'}
            </p>
            <p className="mt-0.5 flex items-center gap-1 font-code text-[11px] font-semibold text-[#D4C7B4]">
              <Clock className="h-3 w-3 text-[#E8C66B]" />
              <span>{Math.ceil(remainingSec)}d</span>
              {isAnimating && <span className="font-sans text-[#E8C66B]">• bergerak</span>}
            </p>
          </div>
        </div>

        {/* Right: Chunky Roll Button */}
        <button
          type="button"
          onClick={onRollDice}
          disabled={!canRoll}
          className="btn-chunky inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border-2 border-[#8A2E1D] bg-[#C44B34] px-4 py-2.5 font-display text-sm font-extrabold text-[#FFFDF8] shadow-[0_3px_0_0_#8A2E1D] hover:bg-[#B2412B] cursor-pointer disabled:cursor-not-allowed disabled:border-[#4A3A2D] disabled:bg-[#3A2D23] disabled:text-[#9E8F7E] disabled:shadow-none"
        >
          <Dices className="h-4.5 w-4.5" />
          <span>
            {hasActiveQuestion
              ? 'Kuis'
              : canRoll
                ? 'LEMPAR DADU'
                : 'Tunggu'}
          </span>
        </button>
      </div>
    </div>
  );
}
