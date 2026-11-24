import { useEffect, useMemo, useRef } from 'react';
import {
  Crown,
  Home,
  Medal,
  RotateCcw,
  Sparkles,
  Trophy,
} from 'lucide-react';
import type { PlayerQuizCounter } from '../store/gameStore';
import type { SaveMatchPayload } from '../types/api';
import type { GameOverEvent, RoomStateData } from '../types/protocol';
import { getPlayerPalette } from '../utils/boardGeometry';

interface GameOverPageProps {
  gameOver: GameOverEvent;
  room: RoomStateData | null;
  myPlayerId: string | null;
  startedAt: string | null;
  quizStatsByPlayer: Record<string, PlayerQuizCounter>;
  /**
   * Callback opsional untuk mengirim ringkasan pertandingan ke REST API
   * (`POST /api/matches`) pada Tahap 5.
   */
  onMatchCompleted?: (payload: SaveMatchPayload) => void | Promise<void>;
  onReturnHome: () => void;
  onOpenLeaderboard: () => void;
}

export function buildMatchSummaryPayload(params: {
  gameOver: GameOverEvent;
  room: RoomStateData | null;
  startedAt: string | null;
  quizStatsByPlayer: Record<string, PlayerQuizCounter>;
}): SaveMatchPayload {
  const { gameOver, room, startedAt, quizStatsByPlayer } = params;
  const roomCode = room?.roomCode || 'ULTA00';
  const finishedAt = new Date().toISOString();
  const matchKey = `${roomCode}-${startedAt ?? finishedAt.slice(0, 16)}`;

  const participants =
    gameOver.ranking.length > 0
      ? gameOver.ranking.map((entry) => {
          const matchedPlayer = room?.players.find(
            (p) =>
              (entry.playerId && p.playerId === entry.playerId) ||
              p.name === entry.name,
          );
          const pid = entry.playerId ?? matchedPlayer?.playerId;
          const quiz = pid ? quizStatsByPlayer[pid] : undefined;

          return {
            ...(pid ? { playerId: pid } : {}),
            playerName: entry.name,
            rank: entry.rank,
            finalPosition: entry.position,
            isWinner: entry.isWinner,
            questionsAnswered: quiz?.answered ?? 0,
            questionsCorrect: quiz?.correct ?? 0,
          };
        })
      : (room?.players ?? []).map((p, idx) => {
          const quiz = quizStatsByPlayer[p.playerId];
          const isWinner =
            p.playerId === gameOver.winnerId || p.name === gameOver.winnerName;
          return {
            playerId: p.playerId,
            playerName: p.name,
            rank: isWinner ? 1 : idx + 1,
            finalPosition: p.position,
            isWinner,
            questionsAnswered: quiz?.answered ?? 0,
            questionsCorrect: quiz?.correct ?? 0,
          };
        });

  return {
    matchKey,
    roomCode,
    winnerName: gameOver.winnerName,
    ...(startedAt ? { startedAt } : {}),
    finishedAt,
    participants,
  };
}

export function GameOverPage({
  gameOver,
  room,
  myPlayerId,
  startedAt,
  quizStatsByPlayer,
  onMatchCompleted,
  onReturnHome,
  onOpenLeaderboard,
}: GameOverPageProps) {
  const syncedKeyRef = useRef<string | null>(null);

  const summaryPayload = useMemo(
    () =>
      buildMatchSummaryPayload({
        gameOver,
        room,
        startedAt,
        quizStatsByPlayer,
      }),
    [gameOver, room, startedAt, quizStatsByPlayer],
  );

  useEffect(() => {
    if (!onMatchCompleted) return;
    const key = summaryPayload.matchKey ?? summaryPayload.roomCode;
    if (syncedKeyRef.current === key) return;
    syncedKeyRef.current = key;
    void onMatchCompleted(summaryPayload);
  }, [onMatchCompleted, summaryPayload]);

  const didIWin = Boolean(
    myPlayerId &&
      (gameOver.winnerId === myPlayerId ||
        gameOver.ranking.some(
          (r) => r.isWinner && r.playerId === myPlayerId,
        )),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-7 sm:px-6 sm:py-10 space-y-6">
      {/* Winner Celebration Banner */}
      <section className="relative overflow-hidden rounded-3xl border-4 border-amber-300 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-500 p-7 text-center text-white shadow-2xl shadow-orange-500/25 sm:p-10">
        <div className="pointer-events-none absolute -left-8 -top-8 h-36 w-36 rounded-full bg-white/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 -right-8 h-40 w-40 rounded-full bg-yellow-200/30 blur-2xl" />

        <div className="relative space-y-3">
          <div className="animate-float-confetti mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/25 shadow-lg backdrop-blur-sm border-2 border-white/40">
            <Trophy className="h-11 w-11 text-yellow-100" />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-yellow-200" />
            <span>
              {didIWin ? 'Selamat, Anda Menang!' : 'Permainan Selesai!'}
            </span>
          </span>

          <h1 className="font-display text-4xl font-bold drop-shadow sm:text-5xl">
            {gameOver.winnerName}
          </h1>
          <p className="text-sm font-semibold text-amber-50 sm:text-base">
            Berhasil menaklukkan papan ULTA/1.0 dan mencapai Petak 100 lebih
            dulu!
          </p>
        </div>
      </section>

      {/* Final Ranking Table */}
      <section className="rounded-3xl border-2 border-amber-200 bg-white/95 p-5 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Medal className="h-5 w-5 text-amber-500" />
            <h2 className="font-display text-xl font-bold text-slate-900">
              Papan Peringkat Akhir
            </h2>
          </div>
          {room?.roomCode && (
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-code text-xs font-bold text-slate-600">
              Room {room.roomCode}
            </span>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-amber-50/90 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-3.5 py-3">Rank</th>
                <th className="px-3.5 py-3">Pemain</th>
                <th className="px-3.5 py-3 text-right">Petak Akhir</th>
                <th className="px-3.5 py-3 text-right">Kuis IT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {summaryPayload.participants.map((p, idx) => {
                const roomPlayer = room?.players.find(
                  (rp) =>
                    (p.playerId && rp.playerId === p.playerId) ||
                    rp.name === p.playerName,
                );
                const palette = getPlayerPalette(roomPlayer?.colorIndex ?? idx);
                const isMe = Boolean(myPlayerId && p.playerId === myPlayerId);

                return (
                  <tr
                    key={`${p.playerName}-${p.rank}`}
                    className={
                      p.isWinner
                        ? 'bg-amber-50/60 font-bold'
                        : 'hover:bg-slate-50/70'
                    }
                  >
                    <td className="px-3.5 py-3 font-display text-base font-bold text-slate-800">
                      <span className="inline-flex items-center gap-1">
                        #{p.rank}
                        {p.rank === 1 && (
                          <Crown className="h-4 w-4 text-amber-500" />
                        )}
                      </span>
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${palette.bg}`}
                        >
                          {p.playerName.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="font-bold text-slate-900">
                          {p.playerName}
                          {isMe ? ' (Anda)' : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-3.5 py-3 text-right font-code font-bold text-slate-700">
                      {p.finalPosition ?? 1}/100
                    </td>
                    <td className="px-3.5 py-3 text-right font-code font-bold text-indigo-700">
                      {p.questionsCorrect ?? 0}/{p.questionsAnswered ?? 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-end">
          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="btn-tactile inline-flex items-center gap-2 rounded-2xl border-2 border-indigo-200 bg-indigo-50 px-5 py-2.5 text-sm font-extrabold text-indigo-700 hover:bg-indigo-100 cursor-pointer"
          >
            <Trophy className="h-4 w-4" />
            <span>Lihat Leaderboard</span>
          </button>

          <button
            type="button"
            onClick={onReturnHome}
            className="btn-tactile inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-2.5 text-sm font-extrabold text-white shadow-[0_3px_0_0_#be123c] hover:from-orange-600 hover:to-rose-600 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Main Lagi / Beranda</span>
            <Home className="h-4 w-4 hidden sm:inline" />
          </button>
        </div>
      </section>
    </div>
  );
}
