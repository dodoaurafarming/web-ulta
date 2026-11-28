import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Crown,
  Home,
  Loader2,
  Medal,
  RefreshCw,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import { syncMatchResult } from '../services/apiClient';
import { audioManager } from '../services/audioManager';
import type { PlayerQuizCounter } from '../store/gameStore';
import type { DataSourceMode, SaveMatchPayload } from '../types/api';
import type { GameOverEvent, RoomStateData } from '../types/protocol';
import { getPlayerPalette } from '../utils/boardGeometry';

interface GameOverPageProps {
  gameOver: GameOverEvent;
  room: RoomStateData | null;
  myPlayerId: string | null;
  boardSeed: number | null;
  startedAt: string | null;
  mockMode: boolean;
  quizStatsByPlayer: Record<string, PlayerQuizCounter>;
  onMatchCompleted?: (payload: SaveMatchPayload) => void | Promise<void>;
  onReturnHome: () => void;
  onOpenLeaderboard: () => void;
}

type SyncState =
  | { status: 'saving' }
  | {
      status: 'saved';
      source: DataSourceMode;
      deduplicated: boolean;
    }
  | {
      status: 'error';
      savedLocally: boolean;
      message: string;
    };

/**
 * Membangun payload ringkasan pertandingan yang deterministik agar beberapa client
 * dalam room multiplayer yang sama menghasilkan `matchKey` identik untuk anti-duplikasi.
 */
export function buildMatchSummaryPayload(params: {
  gameOver: GameOverEvent;
  room: RoomStateData | null;
  boardSeed?: number | null;
  startedAt: string | null;
  quizStatsByPlayer: Record<string, PlayerQuizCounter>;
  finishedAtOverride?: string;
}): SaveMatchPayload {
  const {
    gameOver,
    room,
    boardSeed,
    startedAt,
    quizStatsByPlayer,
    finishedAtOverride,
  } = params;
  const roomCode = (room?.roomCode || 'ULTA00').trim().toUpperCase();
  const finishedAt = finishedAtOverride ?? new Date().toISOString();

  // Jika server mengirimkan board seed (Live Mode Python), seluruh client dalam
  // room yang sama 100% menghasilkan matchKey identik tanpa bergantung jam lokal.
  let matchKey: string;
  if (typeof boardSeed === 'number' && Number.isFinite(boardSeed)) {
    matchKey = `${roomCode}-seed-${boardSeed}`;
  } else {
    const referenceMs = Date.parse(startedAt ?? finishedAt) || Date.now();
    const bucket = Math.floor(referenceMs / 120_000);
    const winnerSlug = gameOver.winnerName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 16);
    matchKey = `${roomCode}-b${bucket}-${winnerSlug || 'win'}`;
  }

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
  boardSeed,
  startedAt,
  mockMode,
  quizStatsByPlayer,
  onMatchCompleted,
  onReturnHome,
  onOpenLeaderboard,
}: GameOverPageProps) {
  const syncedKeyRef = useRef<string | null>(null);
  const [finishedAtIso] = useState(() => new Date().toISOString());
  const [syncState, setSyncState] = useState<SyncState>({ status: 'saving' });

  const summaryPayload = useMemo(
    () =>
      buildMatchSummaryPayload({
        gameOver,
        room,
        boardSeed,
        startedAt,
        quizStatsByPlayer,
        finishedAtOverride: finishedAtIso,
      }),
    [gameOver, room, boardSeed, startedAt, quizStatsByPlayer, finishedAtIso],
  );

  const performSync = useCallback(async () => {
    setSyncState({ status: 'saving' });
    const res = await syncMatchResult(summaryPayload, {
      preferLocal: mockMode,
    });

    if (res.ok) {
      setSyncState({
        status: 'saved',
        source: res.source,
        deduplicated: res.deduplicated,
      });
    } else {
      setSyncState({
        status: 'error',
        savedLocally: res.savedLocally,
        message:
          res.errorMessage ?? 'Gagal menghubungi server Leaderboard global.',
      });
    }

    if (onMatchCompleted) {
      await onMatchCompleted(summaryPayload);
    }
  }, [mockMode, onMatchCompleted, summaryPayload]);

  useEffect(() => {
    const key = summaryPayload.matchKey ?? summaryPayload.roomCode;
    if (syncedKeyRef.current === key) return;
    syncedKeyRef.current = key;
    void performSync();
  }, [performSync, summaryPayload.matchKey, summaryPayload.roomCode]);

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
          {/* Status Sinkronisasi Skor ke Leaderboard */}
          <div
            role="status"
            data-sync-status={syncState.status}
            className={`mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold ${
              syncState.status === 'saved'
                ? 'border-[#BBDAC8] bg-[#E6F2EB] text-[#1D5439]'
                : syncState.status === 'error'
                  ? 'border-[#E7B5A9] bg-[#FCEBE7] text-[#8F2F1E]'
                  : 'border-[#DDD1BE] bg-[#F6EFE2] text-[#605549]'
            }`}
          >
            <div className="flex items-center gap-2">
              {syncState.status === 'saving' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#B7791F]" />
                  <span>Menyimpan hasil pertandingan ke Leaderboard...</span>
                </>
              )}
              {syncState.status === 'saved' && (
                <>
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#266D4B]" />
                  <span>
                    {syncState.source === 'api'
                      ? syncState.deduplicated
                        ? 'Skor tersimpan ke Leaderboard (sudah tersinkronisasi)'
                        : 'Skor tersimpan ke Leaderboard'
                      : 'Skor tersimpan ke Leaderboard lokal'}
                  </span>
                </>
              )}
              {syncState.status === 'error' && (
                <>
                  <AlertCircle className="h-4 w-4 shrink-0 text-[#C44B34]" />
                  <span>
                    Gagal simpan ke API global ({syncState.message})
                    {syncState.savedLocally
                      ? ' — cadangan disimpan lokal.'
                      : '.'}
                  </span>
                </>
              )}
            </div>

            {syncState.status === 'error' && (
              <button
                type="button"
                onClick={() => {
                  audioManager.playUiClick();
                  void performSync();
                }}
                className="btn-tactile inline-flex items-center gap-1 rounded-lg border border-[#C44B34] bg-[#FFFDF8] px-2.5 py-1 text-xs font-bold text-[#8F2F1E] hover:bg-[#FCEBE7] cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Coba Simpan Ulang</span>
              </button>
            )}
          </div>

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
              onClick={() => {
                audioManager.playUiClick();
                onOpenLeaderboard();
              }}
              className="btn-tactile inline-flex items-center gap-2 rounded-xl border border-[#D5C7B2] bg-[#EFE6D6] px-4 py-2.5 text-sm font-bold text-[#1F1A15] hover:bg-[#E5DAC7] cursor-pointer"
            >
              <Trophy className="h-4 w-4 text-[#B7791F]" />
              <span>Lihat Leaderboard</span>
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
