import { useEffect, useState } from 'react';
import { Clock, Dices, Sparkles, WifiOff } from 'lucide-react';
import type { ActiveTurnState } from '../store/gameStore';
import type { MoveEvent, RoomPlayer } from '../types/protocol';
import { getPlayerPalette } from '../utils/boardGeometry';

interface DiceControlPanelProps {
  players: RoomPlayer[];
  positions: Record<string, number>;
  currentTurn: ActiveTurnState | null;
  myPlayerId: string | null;
  isMyTurn: boolean;
  hasActiveQuestion: boolean;
  lastMove: MoveEvent | null;
  onRollDice: () => void;
}

const PIP_POSITIONS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function DiceVisual({
  value,
  rolling,
}: {
  value: number;
  rolling: boolean;
}) {
  const safeVal = Math.max(1, Math.min(6, value));
  const pips = PIP_POSITIONS[safeVal] ?? PIP_POSITIONS[1];

  return (
    <div
      className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-[#C7B8A1] bg-[#FFFDF8] p-2 shadow-[0_4px_0_0_#C7B8A1] ${
        rolling ? 'animate-dice-tumble' : ''
      }`}
      aria-label={`Dadu bernilai ${safeVal}`}
    >
      <div className="grid h-full w-full grid-cols-3 grid-rows-3 place-items-center gap-0.5">
        {Array.from({ length: 9 }).map((_, idx) => (
          <span
            key={idx}
            className={`h-2.5 w-2.5 rounded-full ${
              pips.includes(idx)
                ? safeVal === 6
                  ? 'bg-[#C8523B]'
                  : 'bg-[#1F1B17]'
                : 'bg-transparent'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function DiceControlPanel({
  players,
  positions,
  currentTurn,
  myPlayerId,
  isMyTurn,
  hasActiveQuestion,
  lastMove,
  onRollDice,
}: DiceControlPanelProps) {
  const [remainingSec, setRemainingSec] = useState<number>(
    currentTurn?.deadline ?? 10,
  );
  const [rollingAnim, setRollingAnim] = useState(false);

  useEffect(() => {
    if (!currentTurn) {
      setRemainingSec(0);
      return;
    }

    const updateTimer = () => {
      const elapsedSec = (Date.now() - currentTurn.startedAt) / 1000;
      const left = Math.max(0, currentTurn.deadline - elapsedSec);
      setRemainingSec(left);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [currentTurn]);

  useEffect(() => {
    if (!lastMove) return;
    setRollingAnim(true);
    const timer = setTimeout(() => setRollingAnim(false), 500);
    return () => clearTimeout(timer);
  }, [lastMove]);

  const activePlayer = players.find(
    (p) => p.playerId === currentTurn?.playerId,
  );
  const activePalette = activePlayer
    ? getPlayerPalette(activePlayer.colorIndex)
    : null;
  const deadline = currentTurn?.deadline ?? 10;
  const progressPct =
    deadline > 0
      ? Math.max(0, Math.min(100, (remainingSec / deadline) * 100))
      : 0;
  const isUrgent = remainingSec <= 3 && remainingSec > 0;

  const handleRollClick = () => {
    if (!isMyTurn || hasActiveQuestion) return;
    setRollingAnim(true);
    onRollDice();
    setTimeout(() => setRollingAnim(false), 550);
  };

  return (
    <div className="space-y-3.5">
      {/* Kartu Giliran & Dadu */}
      <section
        className={`surface-card rounded-2xl p-4 transition-colors ${
          isMyTurn ? 'border-[#C8523B] ring-2 ring-[#C8523B]/20' : ''
        }`}
      >
        {/* Header Giliran */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {activePalette && (
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#FFFDF8] text-[#FFFDF8] font-display text-xs font-extrabold shadow-sm ${activePalette.bg}`}
              >
                {activePlayer?.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#645A4E]">
                Giliran Aktif
              </p>
              <p className="truncate font-display text-base font-bold text-[#1F1B17]">
                {activePlayer
                  ? activePlayer.playerId === myPlayerId
                    ? `${activePlayer.name} — Giliran Anda`
                    : activePlayer.name
                  : 'Menunggu giliran...'}
              </p>
            </div>
          </div>

          <div
            className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 font-code text-xs font-bold ${
              isUrgent
                ? 'border-[#ECC1B7] bg-[#FCEBE7] text-[#963826]'
                : 'border-[#E7CB82] bg-[#FDF3D7] text-[#7D530B]'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{Math.ceil(remainingSec)}d</span>
          </div>
        </div>

        {/* Countdown Bar 10 Detik */}
        <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[#ECE3D3]">
          <div
            style={{ width: `${progressPct}%` }}
            className={`h-full rounded-full transition-all duration-100 ${
              isUrgent ? 'bg-[#C8523B]' : 'bg-[#2F7D57]'
            }`}
          />
        </div>

        {/* Area Dadu & Tombol ROLL */}
        <div className="surface-inset mt-3.5 flex items-center justify-between gap-3 rounded-xl p-3">
          <div className="flex items-center gap-3 min-w-0">
            <DiceVisual value={lastMove?.dice ?? 1} rolling={rollingAnim} />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#645A4E]">
                Hasil Dadu
              </p>
              <p className="font-display text-xl font-extrabold text-[#1F1B17] leading-tight">
                {lastMove ? `Angka ${lastMove.dice}` : 'Siap'}
              </p>
              {lastMove?.dice === 6 && (
                <span className="mt-0.5 inline-flex items-center gap-1 rounded bg-[#FCEBE7] px-1.5 py-0.5 text-[10px] font-bold text-[#963826]">
                  <Sparkles className="h-3 w-3" />
                  Giliran Ekstra
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRollClick}
          disabled={!isMyTurn || hasActiveQuestion}
          className="btn-tactile mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-[#963826] bg-[#C8523B] px-4 py-3 text-sm font-bold text-[#FFFDF8] shadow-[0_3px_0_0_#963826] hover:bg-[#B54731] cursor-pointer disabled:cursor-not-allowed disabled:border-[#D9CEBC] disabled:bg-[#EBE3D5] disabled:text-[#8A7F72] disabled:shadow-none"
        >
          <Dices className="h-4.5 w-4.5" />
          <span>
            {hasActiveQuestion
              ? 'Kuis Sedang Berlangsung...'
              : isMyTurn
                ? 'Lempar Dadu'
                : 'Menunggu Giliran'}
          </span>
        </button>
      </section>

      {/* Daftar Posisi Pemain Ringkas */}
      <section className="surface-card rounded-2xl p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <h3 className="font-display text-sm font-bold text-[#1F1B17]">
            Posisi Pemain
          </h3>
          <span className="text-[11px] font-semibold text-[#645A4E]">
            Target 100
          </span>
        </div>

        <div className="space-y-2">
          {players.map((player) => {
            const pos = positions[player.playerId] ?? player.position ?? 1;
            const palette = getPlayerPalette(player.colorIndex);
            const isTurn = player.playerId === currentTurn?.playerId;
            const isMe = player.playerId === myPlayerId;

            return (
              <div
                key={player.playerId}
                className={`rounded-xl border px-2.5 py-2 transition-colors ${
                  isTurn
                    ? 'border-[#C8523B]/60 bg-[#FCF5EE]'
                    : 'border-[#E8DFD0] bg-[#FAF6EE]/70'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-[#FFFDF8] ${palette.bg}`}
                    >
                      {player.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="truncate font-semibold text-[#1F1B17]">
                      {player.name}
                      {isMe ? ' (Anda)' : ''}
                    </span>
                    {!player.online && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-[#FCEBE7] px-1.5 py-0.5 text-[10px] font-bold text-[#963826]">
                        <WifiOff className="h-2.5 w-2.5" />
                        Offline
                      </span>
                    )}
                  </div>
                  <span className="font-code text-xs font-bold text-[#5A5045]">
                    {pos}/100
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#E8DFD0]">
                  <div
                    style={{ width: `${pos}%` }}
                    className={`h-full rounded-full transition-all duration-300 ${palette.bg}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
