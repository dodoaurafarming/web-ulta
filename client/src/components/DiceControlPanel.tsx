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
      className={`relative flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-amber-300 bg-gradient-to-br from-white via-amber-50 to-amber-100 p-2.5 shadow-[0_6px_0_0_#d97706,0_12px_20px_-4px_rgba(217,119,6,0.35)] ${
        rolling ? 'animate-dice-tumble' : ''
      }`}
      aria-label={`Dadu bernilai ${safeVal}`}
    >
      <div className="grid h-full w-full grid-cols-3 grid-rows-3 place-items-center gap-0.5">
        {Array.from({ length: 9 }).map((_, idx) => (
          <span
            key={idx}
            className={`h-3 w-3 rounded-full transition-all ${
              pips.includes(idx)
                ? safeVal === 6
                  ? 'bg-rose-500 shadow-inner'
                  : 'bg-slate-800 shadow-inner'
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

  // Countdown visual 10 detik untuk giliran aktif
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

  // Animasi dadu singkat saat MOVE diterima
  useEffect(() => {
    if (!lastMove) return;
    setRollingAnim(true);
    const timer = setTimeout(() => setRollingAnim(false), 550);
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
    deadline > 0 ? Math.max(0, Math.min(100, (remainingSec / deadline) * 100)) : 0;
  const isUrgent = remainingSec <= 3 && remainingSec > 0;

  const handleRollClick = () => {
    if (!isMyTurn || hasActiveQuestion) return;
    setRollingAnim(true);
    onRollDice();
    setTimeout(() => setRollingAnim(false), 600);
  };

  return (
    <div className="space-y-4">
      {/* Turn & Dice Card */}
      <section
        className={`rounded-3xl border-2 bg-white/95 p-4 shadow-xl transition-all sm:p-5 ${
          isMyTurn
            ? 'border-amber-400 ring-4 ring-amber-200/70'
            : 'border-slate-200'
        }`}
      >
        {/* Active Turn Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {activePalette && (
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 text-white font-display text-sm font-bold shadow ${activePalette.bg} ${activePalette.border}`}
              >
                {activePlayer?.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Giliran Aktif
              </p>
              <p className="truncate font-display text-lg font-bold text-slate-900">
                {activePlayer
                  ? activePlayer.playerId === myPlayerId
                    ? `${activePlayer.name} (Giliran Anda!)`
                    : activePlayer.name
                  : 'Menunggu giliran...'}
              </p>
            </div>
          </div>

          <div
            className={`inline-flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1 font-code text-xs font-bold ${
              isUrgent
                ? 'bg-rose-100 text-rose-700 animate-pulse'
                : 'bg-amber-100 text-amber-900'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{Math.ceil(remainingSec)}d</span>
          </div>
        </div>

        {/* 10s Countdown Progress Bar */}
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            style={{ width: `${progressPct}%` }}
            className={`h-full rounded-full transition-all duration-100 ${
              isUrgent
                ? 'bg-gradient-to-r from-rose-500 to-red-600'
                : 'bg-gradient-to-r from-amber-400 to-orange-500'
            }`}
          />
        </div>

        {/* Dice + Roll Button */}
        <div className="mt-4 flex flex-col items-center gap-4 rounded-2xl bg-amber-50/70 p-4 border border-amber-100 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3.5">
            <DiceVisual value={lastMove?.dice ?? 1} rolling={rollingAnim} />
            <div className="text-left">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Dadu Terakhir
              </p>
              <p className="font-display text-2xl font-bold text-slate-900">
                {lastMove ? `Angka ${lastMove.dice}` : 'Siap Lempar'}
              </p>
              {lastMove?.dice === 6 && (
                <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700">
                  <Sparkles className="h-3 w-3" />
                  Bonus Giliran!
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleRollClick}
            disabled={!isMyTurn || hasActiveQuestion}
            className="btn-tactile flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500 px-5 py-3.5 text-sm font-extrabold text-white shadow-[0_4px_0_0_#be123c] hover:from-orange-600 hover:to-pink-600 cursor-pointer disabled:cursor-not-allowed disabled:from-slate-300 disabled:via-slate-300 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none sm:w-auto"
          >
            <Dices className="h-5 w-5" />
            <span>
              {hasActiveQuestion
                ? 'Kuis Aktif...'
                : isMyTurn
                  ? 'Lempar Dadu'
                  : 'Tunggu Giliran'}
            </span>
          </button>
        </div>
      </section>

      {/* Player Standings Strip */}
      <section className="rounded-3xl border-2 border-slate-200 bg-white/95 p-4 shadow-lg">
        <h3 className="mb-3 font-display text-base font-bold text-slate-900">
          Posisi Pemain
        </h3>
        <div className="space-y-2">
          {players.map((player) => {
            const pos = positions[player.playerId] ?? player.position ?? 1;
            const palette = getPlayerPalette(player.colorIndex);
            const isTurn = player.playerId === currentTurn?.playerId;
            const isMe = player.playerId === myPlayerId;

            return (
              <div
                key={player.playerId}
                className={`rounded-2xl border p-2.5 transition-all ${
                  isTurn
                    ? 'border-amber-400 bg-amber-50/80'
                    : 'border-slate-100 bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${palette.bg}`}
                    >
                      {player.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="truncate font-bold text-slate-800">
                      {player.name}
                      {isMe ? ' (Anda)' : ''}
                    </span>
                    {!player.online && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                        <WifiOff className="h-2.5 w-2.5" />
                        Offline
                      </span>
                    )}
                  </div>
                  <span className="font-code text-xs font-bold text-slate-700">
                    Petak {pos}/100
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
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
