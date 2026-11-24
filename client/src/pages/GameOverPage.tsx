import { useEffect, useMemo, useRef } from 'react';
import { Crown, Home, Medal, RotateCcw, Trophy } from 'lucide-react';
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
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="studio-panel overflow-hidden rounded-2xl">
        {/* Plakat Kemenangan */}
        <div className="border-b-2 border-[#352517] bg-[#2A1E15] px-6 py-8 text-center text-[#FAF6EE] sm:px-8">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[#E5C068] bg-[#3A2B1F] text-[#F7E3AC]">
            <Trophy className="h-7 w-7" />
          </div>
          <h1 className="font-display text-3xl font-extrabold text-[#FFFDF8] sm:text-5xl">
            {gameOver.winnerName}
          </h1>
          <p className="mt-2 text-sm font-medium text-[#D4C7B4]">
            {didIWin
              ? 'Selamat, kamu berhasil mencapai petak 100 lebih dulu.'
              : 'Permainan selesai — pemenang berhasil menaklukkan petak 100.'}
          </p>
        </div>

        {/* Tabel Peringkat Akhir */}
        <div className="p-6 sm:p-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Medal className="h-5 w-5 text-[#B7791F]" />
              <h2 className="font-display text-xl font-extrabold text-[#1F1A15]">
                Papan peringkat akhir
              </h2>
            </div>
            {room?.roomCode && (
              <span className="font-code text-xs font-bold text-[#605549]">
                Room {room.roomCode}
              </span>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-[#DDD1BE]">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#EFE6D6] text-xs font-bold text-[#5A5045]">
                <tr>
                  <th className="px-4 py-2.5">Rank</th>
                  <th className="px-4 py-2.5">Pemain</th>
                  <th className="px-4 py-2.5 text-right">Petak akhir</th>
                  <th className="px-4 py-2.5 text-right">Kuis IT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DEC9] bg-[#FFFDF8]">
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
                      className={p.isWinner ? 'bg-[#FDF3D7]/65' : ''}
                    >
                      <td className="px-4 py-3 font-display text-base font-extrabold text-[#1F1A15]">
                        <span className="inline-flex items-center gap-1">
                          #{p.rank}
                          {p.rank === 1 && (
                            <Crown className="h-4 w-4 text-[#B7791F]" />
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-[#FFFDF8] ${palette.bg}`}
                          >
                            {p.playerName.slice(0, 1).toUpperCase()}
                          </span>
                          <span className="font-bold text-[#1F1A15]">
                            {p.playerName}
                            {isMe ? ' (Kamu)' : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-code font-bold text-[#5A5045]">
                        {p.finalPosition ?? 1}/100
                      </td>
                      <td className="px-4 py-3 text-right font-code font-bold text-[#266D4B]">
                        {p.questionsCorrect ?? 0}/{p.questionsAnswered ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="btn-tactile inline-flex items-center gap-2 rounded-xl border border-[#D5C7B2] bg-[#EFE6D6] px-4 py-2.5 text-sm font-bold text-[#1F1A15] hover:bg-[#E5DAC7] cursor-pointer"
            >
              <Trophy className="h-4 w-4 text-[#B7791F]" />
              <span>Leaderboard</span>
            </button>

            <button
              type="button"
              onClick={onReturnHome}
              className="btn-chunky inline-flex items-center gap-2 rounded-xl border-2 border-[#8A2E1D] bg-[#C44B34] px-5 py-2.5 font-display text-sm font-extrabold text-[#FFFDF8] shadow-[0_3px_0_0_#8A2E1D] hover:bg-[#B2412B] cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Main Lagi</span>
              <Home className="h-4 w-4 hidden sm:inline" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
