import { useEffect, useMemo, useRef } from 'react';
import {
  Award,
  Crown,
  Home,
  Medal,
  RotateCcw,
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
      {/* Plakat Pemenang Tabletop */}
      <section className="rounded-2xl border-2 border-[#352517] bg-[#241E19] p-7 text-center text-[#FAF6EE] shadow-[0_6px_0_0_#352517] sm:p-9">
        <div className="space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[#E5C068] bg-[#332A22] text-[#F8E7B4]">
            <Trophy className="h-8 w-8" />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-md border border-[#5C4A3B] bg-[#332A22] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#E8C66B]">
            <Award className="h-3.5 w-3.5" />
            <span>
              {didIWin ? 'Selamat, Anda Memenangkan Sesi!' : 'Permainan Selesai'}
            </span>
          </span>

          <h1 className="font-display text-3xl font-extrabold text-[#FFFDF8] sm:text-5xl">
            {gameOver.winnerName}
          </h1>
          <p className="text-sm font-medium text-[#D6CBB9]">
            Pemenang sesi ULTA/1.0 — berhasil mencapai Petak 100 lebih dulu.
          </p>
        </div>
      </section>

      {/* Tabel Peringkat Akhir */}
      <section className="surface-card rounded-2xl p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between border-b border-[#EAE0D0] pb-3">
          <div className="flex items-center gap-2">
            <Medal className="h-5 w-5 text-[#B7791F]" />
            <h2 className="font-display text-xl font-extrabold text-[#1F1B17]">
              Papan Peringkat Akhir
            </h2>
          </div>
          {room?.roomCode && (
            <span className="rounded-md border border-[#D9CEBC] bg-[#F3ECE0] px-2.5 py-1 font-code text-xs font-bold text-[#5A5045]">
              Room {room.roomCode}
            </span>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-[#DFD5C5]">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#F3ECE0] text-[11px] font-bold uppercase tracking-wider text-[#5A5045]">
              <tr>
                <th className="px-3.5 py-2.5">Rank</th>
                <th className="px-3.5 py-2.5">Pemain</th>
                <th className="px-3.5 py-2.5 text-right">Petak Akhir</th>
                <th className="px-3.5 py-2.5 text-right">Kuis IT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDE5D7] bg-[#FFFDF8]">
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
                    className={p.isWinner ? 'bg-[#FDF4DC]/70' : ''}
                  >
                    <td className="px-3.5 py-3 font-display text-base font-extrabold text-[#1F1B17]">
                      <span className="inline-flex items-center gap-1">
                        #{p.rank}
                        {p.rank === 1 && (
                          <Crown className="h-4 w-4 text-[#B7791F]" />
                        )}
                      </span>
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-[#FFFDF8] ${palette.bg}`}
                        >
                          {p.playerName.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="font-bold text-[#1F1B17]">
                          {p.playerName}
                          {isMe ? ' (Anda)' : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-3.5 py-3 text-right font-code font-bold text-[#5A5045]">
                      {p.finalPosition ?? 1}/100
                    </td>
                    <td className="px-3.5 py-3 text-right font-code font-bold text-[#2F7D57]">
                      {p.questionsCorrect ?? 0}/{p.questionsAnswered ?? 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-end">
          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="btn-tactile inline-flex items-center gap-2 rounded-xl border border-[#D9CEBC] bg-[#F3ECE0] px-4 py-2.5 text-sm font-bold text-[#1F1B17] hover:bg-[#EAE0CF] cursor-pointer"
          >
            <Trophy className="h-4 w-4 text-[#B7791F]" />
            <span>Lihat Leaderboard</span>
          </button>

          <button
            type="button"
            onClick={onReturnHome}
            className="btn-tactile inline-flex items-center gap-2 rounded-xl border-[1.5px] border-[#963826] bg-[#C8523B] px-5 py-2.5 text-sm font-bold text-[#FFFDF8] shadow-[0_3px_0_0_#963826] hover:bg-[#B54731] cursor-pointer"
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
