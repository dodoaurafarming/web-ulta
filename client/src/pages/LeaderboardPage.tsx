import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Clock,
  Crown,
  Database,
  History,
  Medal,
  RefreshCw,
  Search,
  Sparkles,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { fetchLeaderboard, fetchMatchHistory } from '../services/apiClient';
import { audioManager } from '../services/audioManager';
import type {
  DataSourceMode,
  LeaderboardEntry,
  MatchHistoryRecord,
} from '../types/api';
import { getPlayerPalette } from '../utils/boardGeometry';

interface LeaderboardPageProps {
  mockMode: boolean;
  onBackToGame: () => void;
}

type ActiveTab = 'leaderboard' | 'history';

function formatMatchTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export function LeaderboardPage({
  mockMode,
  onBackToGame,
}: LeaderboardPageProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('leaderboard');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roomFilterInput, setRoomFilterInput] = useState('');
  const [debouncedRoomFilter, setDebouncedRoomFilter] = useState('');

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [matches, setMatches] = useState<MatchHistoryRecord[]>([]);
  const [source, setSource] = useState<DataSourceMode>('local');
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [errorNote, setErrorNote] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 220);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedRoomFilter(roomFilterInput.trim().toUpperCase());
    }, 220);
    return () => window.clearTimeout(id);
  }, [roomFilterInput]);

  const loadLeaderboardData = useCallback(async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await fetchLeaderboard({
        search: debouncedSearch || undefined,
        limit: 50,
        preferLocal: mockMode,
      });
      setEntries(res.items);
      setSource(res.source);
      setErrorNote(
        res.fallbackReason === 'api-unreachable'
          ? (res.errorMessage ?? null)
          : null,
      );
    } finally {
      setLoadingLeaderboard(false);
    }
  }, [debouncedSearch, mockMode]);

  const loadHistoryData = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetchMatchHistory({
        roomCode: debouncedRoomFilter || undefined,
        limit: 25,
        preferLocal: mockMode,
      });
      setMatches(res.items);
      setSource(res.source);
      setErrorNote(
        res.fallbackReason === 'api-unreachable'
          ? (res.errorMessage ?? null)
          : null,
      );
    } finally {
      setLoadingHistory(false);
    }
  }, [debouncedRoomFilter, mockMode]);

  useEffect(() => {
    void loadLeaderboardData();
  }, [loadLeaderboardData]);

  useEffect(() => {
    void loadHistoryData();
  }, [loadHistoryData]);

  const isLoading =
    activeTab === 'leaderboard' ? loadingLeaderboard : loadingHistory;

  const handleRefresh = () => {
    audioManager.playUiClick();
    void loadLeaderboardData();
    void loadHistoryData();
  };

  const topThree =
    !debouncedSearch && entries.length > 0 ? entries.slice(0, 3) : [];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Header Utama */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-center justify-between sm:justify-start">
            <button
              type="button"
              onClick={() => {
                audioManager.playUiClick();
                onBackToGame();
              }}
              className="btn-tactile inline-flex items-center gap-1.5 rounded-xl border border-[#D5C7B2] bg-[#FFFDF8] px-3 py-2 text-xs font-bold text-[#1F1A15] hover:bg-[#EFE6D6] cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali</span>
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading}
              className="btn-tactile sm:hidden inline-flex items-center gap-1.5 rounded-xl border border-[#D5C7B2] bg-[#FFFDF8] px-3 py-2 text-xs font-bold text-[#1F1A15] hover:bg-[#EFE6D6] cursor-pointer disabled:opacity-60"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
              />
              <span>Muat Ulang</span>
            </button>
          </div>

          <div>
            <h1 className="font-display text-2xl font-extrabold text-[#1F1A15] sm:text-3xl">
              Leaderboard & Riwayat
            </h1>
            <p className="text-xs font-medium text-[#605549] sm:text-sm">
              Klasemen pemain, akurasi kuis IT, dan catatan pertandingan terbaru.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading}
          className="btn-tactile hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[#D5C7B2] bg-[#FFFDF8] px-3.5 py-2 text-xs font-bold text-[#1F1A15] hover:bg-[#EFE6D6] cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Muat Ulang</span>
        </button>
      </div>

      {/* Banner Informasi Sumber Data */}
      {source === 'local' ? (
        <div
          role="status"
          className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E5C068] bg-[#FDF3D7] px-4 py-2.5 text-xs font-semibold text-[#7A4E10]"
        >
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 shrink-0 text-[#B7791F]" />
            <span>
              Menampilkan data lokal — hubungkan API TiDB untuk leaderboard global
            </span>
          </div>
          {errorNote && (
            <span className="font-code text-[11px] text-[#8F5B12]">
              ({errorNote})
            </span>
          )}
        </div>
      ) : (
        <div
          role="status"
          className="mb-5 flex items-center gap-2 rounded-xl border border-[#BBDAC8] bg-[#E6F2EB] px-4 py-2 text-xs font-semibold text-[#1D5439]"
        >
          <Database className="h-4 w-4 shrink-0 text-[#266D4B]" />
          <span>Terhubung ke Leaderboard Global (TiDB Cloud API)</span>
        </div>
      )}

      {/* Switcher Tab + Pencarian */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Tampilan statistik"
          className="inline-flex w-full sm:w-auto rounded-xl border border-[#D5C7B2] bg-[#EFE6D6] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'leaderboard'}
            onClick={() => {
              audioManager.playUiClick();
              setActiveTab('leaderboard');
            }}
            className={`inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'bg-[#2A1E15] text-[#FFFDF8] shadow-sm'
                : 'text-[#605549] hover:text-[#1F1A15]'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            <span>Peringkat</span>
            <span
              className={`ml-0.5 rounded-full px-1.5 py-0.2 font-code text-[10px] ${
                activeTab === 'leaderboard'
                  ? 'bg-[#463324] text-[#F7E3AC]'
                  : 'bg-[#E2D6C1] text-[#605549]'
              }`}
            >
              {entries.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            onClick={() => {
              audioManager.playUiClick();
              setActiveTab('history');
            }}
            className={`inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#2A1E15] text-[#FFFDF8] shadow-sm'
                : 'text-[#605549] hover:text-[#1F1A15]'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Riwayat Pertandingan</span>
            <span
              className={`ml-0.5 rounded-full px-1.5 py-0.2 font-code text-[10px] ${
                activeTab === 'history'
                  ? 'bg-[#463324] text-[#F7E3AC]'
                  : 'bg-[#E2D6C1] text-[#605549]'
              }`}
            >
              {matches.length}
            </span>
          </button>
        </div>

        {/* Input Pencarian sesuai Tab aktif */}
        {activeTab === 'leaderboard' ? (
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A6F62]" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nama pemain..."
              aria-label="Cari nama pemain"
              className="w-full rounded-xl border border-[#D5C7B2] bg-[#FFFDF8] py-2 pl-9 pr-8 text-xs font-semibold text-[#1F1A15] placeholder:text-[#8E8274] focus:border-[#266D4B] focus:outline-none"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                aria-label="Hapus pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A6F62] hover:text-[#1F1A15] cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A6F62]" />
            <input
              type="text"
              value={roomFilterInput}
              onChange={(e) => setRoomFilterInput(e.target.value.toUpperCase())}
              placeholder="Filter kode room..."
              aria-label="Filter kode room"
              className="w-full rounded-xl border border-[#D5C7B2] bg-[#FFFDF8] py-2 pl-9 pr-8 font-code text-xs font-bold uppercase text-[#1F1A15] placeholder:font-sans placeholder:normal-case placeholder:text-[#8E8274] focus:border-[#266D4B] focus:outline-none"
            />
            {roomFilterInput && (
              <button
                type="button"
                onClick={() => setRoomFilterInput('')}
                aria-label="Hapus filter room"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A6F62] hover:text-[#1F1A15] cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Konten Tab Peringkat */}
      {activeTab === 'leaderboard' ? (
        <div className="space-y-5">
          {/* Podium Top 3 */}
          {topThree.length > 0 && (
            <section aria-label="Podium 3 Besar" className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
              {topThree.map((entry, idx) => {
                const isFirst = idx === 0;
                const isSecond = idx === 1;
                const orderClass = isFirst
                  ? 'sm:order-2'
                  : isSecond
                    ? 'sm:order-1'
                    : 'sm:order-3';
                const palette = getPlayerPalette(idx);

                return (
                  <article
                    key={entry.id}
                    className={`rounded-2xl border-2 p-4 transition-transform ${orderClass} ${
                      isFirst
                        ? 'border-[#352517] bg-[#2A1E15] text-[#FAF6EE] shadow-[0_5px_0_0_#1D140D] sm:pb-6'
                        : 'border-[#D5C7B2] bg-[#FFFDF8] text-[#1F1A15] shadow-[0_3px_0_0_#DDD1BE]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-display text-xs font-extrabold ${
                          isFirst
                            ? 'bg-[#3E2D20] text-[#F7E3AC] border border-[#E5C068]/50'
                            : isSecond
                              ? 'bg-[#E6F2EB] text-[#1D5439] border border-[#BBDAC8]'
                              : 'bg-[#FCEBE7] text-[#8F2F1E] border border-[#E7B5A9]'
                        }`}
                      >
                        {isFirst ? (
                          <Crown className="h-3.5 w-3.5 text-[#E5C068]" />
                        ) : (
                          <Medal className="h-3.5 w-3.5" />
                        )}
                        <span>Peringkat #{entry.rank}</span>
                      </span>

                      <span
                        className={`font-code text-xs font-bold ${
                          isFirst ? 'text-[#E5C068]' : 'text-[#266D4B]'
                        }`}
                      >
                        {entry.winRate}% menang
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-extrabold text-[#FFFDF8] ${
                          isFirst
                            ? 'border-[#E5C068] bg-[#B7791F]'
                            : `border-[#FFFDF8] ${palette.bg}`
                        }`}
                      >
                        {entry.playerName.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <h2
                          className={`truncate font-display text-lg font-extrabold ${
                            isFirst ? 'text-[#FFFDF8]' : 'text-[#1F1A15]'
                          }`}
                        >
                          {entry.playerName}
                        </h2>
                        <p
                          className={`text-xs font-medium ${
                            isFirst ? 'text-[#D4C7B4]' : 'text-[#605549]'
                          }`}
                        >
                          {entry.gamesWon} menang dari {entry.gamesPlayed} main
                        </p>
                      </div>
                    </div>

                    <div
                      className={`mt-4 grid grid-cols-2 gap-2 rounded-xl p-2.5 text-xs ${
                        isFirst ? 'bg-[#3A2A1E]' : 'bg-[#F6EFE2]'
                      }`}
                    >
                      <div>
                        <span
                          className={`block text-[11px] ${
                            isFirst ? 'text-[#C6B7A2]' : 'text-[#6E6356]'
                          }`}
                        >
                          Akurasi Kuis
                        </span>
                        <span
                          className={`font-code font-bold ${
                            isFirst ? 'text-[#FFFDF8]' : 'text-[#1F1A15]'
                          }`}
                        >
                          {entry.quizAccuracy}%
                        </span>
                      </div>
                      <div>
                        <span
                          className={`block text-[11px] ${
                            isFirst ? 'text-[#C6B7A2]' : 'text-[#6E6356]'
                          }`}
                        >
                          Posisi Rata-rata
                        </span>
                        <span
                          className={`font-code font-bold ${
                            isFirst ? 'text-[#FFFDF8]' : 'text-[#1F1A15]'
                          }`}
                        >
                          {entry.averagePosition > 0
                            ? `Petak ${entry.averagePosition}`
                            : '-'}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}

          {/* Tabel Peringkat Lengkap */}
          <section className="studio-panel overflow-hidden rounded-2xl">
            {loadingLeaderboard ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm font-semibold text-[#605549]">
                <RefreshCw className="h-4 w-4 animate-spin text-[#266D4B]" />
                <span>Memuat klasemen pemain...</span>
              </div>
            ) : entries.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#DDD1BE] bg-[#EFE6D6] text-[#B7791F]">
                  <Trophy className="h-6 w-6" />
                </div>
                <h2 className="font-display text-lg font-extrabold text-[#1F1A15]">
                  {debouncedSearch
                    ? `Pemain "${debouncedSearch}" tidak ditemukan`
                    : 'Belum ada data klasemen'}
                </h2>
                <p className="mx-auto mt-1 max-w-md text-xs font-medium text-[#605549] sm:text-sm">
                  {debouncedSearch
                    ? 'Coba kata kunci nama lain atau bersihkan pencarian.'
                    : 'Selesaikan satu pertandingan hingga mencapai petak 100 untuk mencatat skor pertama ke Leaderboard.'}
                </p>
                {!debouncedSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      audioManager.playUiClick();
                      onBackToGame();
                    }}
                    className="btn-chunky mt-4 inline-flex items-center gap-1.5 rounded-xl border-2 border-[#1B5136] bg-[#266D4B] px-4 py-2 font-display text-xs font-extrabold text-[#FFFDF8] shadow-[0_3px_0_0_#1B5136] hover:bg-[#205E40] cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Mulai Main Sekarang</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-xs sm:text-sm">
                  <thead className="border-b border-[#DDD1BE] bg-[#EFE6D6] text-xs font-bold text-[#5A5045]">
                    <tr>
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">Nama</th>
                      <th className="px-4 py-3 text-right">Menang</th>
                      <th className="px-4 py-3 text-right">Total Main</th>
                      <th className="px-4 py-3 text-right">Win Rate %</th>
                      <th className="px-4 py-3 text-right">Akurasi Kuis %</th>
                      <th className="px-4 py-3 text-right">Posisi Rata-rata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8DEC9] bg-[#FFFDF8]">
                    {entries.map((entry, idx) => {
                      const palette = getPlayerPalette(idx);
                      return (
                        <tr
                          key={`${entry.id}-${entry.playerName}`}
                          className={
                            entry.rank === 1
                              ? 'bg-[#FDF3D7]/55'
                              : 'hover:bg-[#FAF4E8]'
                          }
                        >
                          <td className="px-4 py-3 font-display text-sm font-extrabold text-[#1F1A15]">
                            <span className="inline-flex items-center gap-1">
                              #{entry.rank}
                              {entry.rank === 1 && (
                                <Crown className="h-3.5 w-3.5 text-[#B7791F]" />
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-[#FFFDF8] ${palette.bg}`}
                              >
                                {entry.playerName.slice(0, 1).toUpperCase()}
                              </span>
                              <span className="font-bold text-[#1F1A15]">
                                {entry.playerName}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-code font-bold text-[#1D5439]">
                            {entry.gamesWon}
                          </td>
                          <td className="px-4 py-3 text-right font-code font-semibold text-[#5A5045]">
                            {entry.gamesPlayed}
                          </td>
                          <td className="px-4 py-3 text-right font-code font-bold text-[#1F1A15]">
                            {entry.winRate}%
                          </td>
                          <td className="px-4 py-3 text-right font-code font-semibold text-[#266D4B]">
                            <span>{entry.quizAccuracy}%</span>
                            {entry.questionsAnswered > 0 && (
                              <span className="ml-1 text-[11px] font-normal text-[#7A6F62]">
                                ({entry.questionsCorrect}/{entry.questionsAnswered})
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-code font-semibold text-[#5A5045]">
                            {entry.averagePosition > 0
                              ? `${entry.averagePosition}/100`
                              : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : (
        /* Konten Tab Riwayat Pertandingan */
        <div className="space-y-3">
          {loadingHistory ? (
            <div className="studio-panel flex items-center justify-center gap-2 rounded-2xl py-12 text-sm font-semibold text-[#605549]">
              <RefreshCw className="h-4 w-4 animate-spin text-[#266D4B]" />
              <span>Memuat riwayat pertandingan...</span>
            </div>
          ) : matches.length === 0 ? (
            <div className="studio-panel rounded-2xl px-6 py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#DDD1BE] bg-[#EFE6D6] text-[#605549]">
                <History className="h-6 w-6" />
              </div>
              <h2 className="font-display text-lg font-extrabold text-[#1F1A15]">
                {debouncedRoomFilter
                  ? `Belum ada riwayat untuk room "${debouncedRoomFilter}"`
                  : 'Belum ada riwayat pertandingan'}
              </h2>
              <p className="mx-auto mt-1 max-w-md text-xs font-medium text-[#605549] sm:text-sm">
                Setiap permainan yang selesai mencapai petak 100 akan tercatat otomatis beserta peringkat peserta dan hasil kuis IT.
              </p>
            </div>
          ) : (
            matches.map((match) => (
              <article
                key={`${match.id}-${match.matchKey ?? match.finishedAt}`}
                className="studio-panel overflow-hidden rounded-2xl"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5DAC7] bg-[#F6EFE2] px-4 py-3 sm:px-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-lg border border-[#352517] bg-[#2A1E15] px-2.5 py-0.5 font-code text-xs font-bold text-[#F7E3AC]">
                      {match.roomCode}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg border border-[#E5C068] bg-[#FDF3D7] px-2.5 py-0.5 text-xs font-bold text-[#7A4E10]">
                      <Crown className="h-3.5 w-3.5 text-[#B7791F]" />
                      <span>Pemenang: {match.winnerName}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-semibold text-[#605549]">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>{match.totalPlayers} pemain</span>
                    </span>
                    <span className="inline-flex items-center gap-1 font-code text-[11px]">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatMatchTime(match.finishedAt)}</span>
                    </span>
                  </div>
                </div>

                <div className="p-4 sm:px-5">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {match.participants.map((p, idx) => {
                      const palette = getPlayerPalette(idx);
                      return (
                        <div
                          key={`${match.id}-${p.playerName}-${p.rank}`}
                          className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
                            p.isWinner
                              ? 'border-[#E5C068] bg-[#FDF3D7]/60'
                              : 'border-[#E5DAC7] bg-[#FFFDF8]'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="font-display text-sm font-extrabold text-[#1F1A15]">
                              #{p.rank}
                            </span>
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-[#FFFDF8] ${palette.bg}`}
                            >
                              {p.playerName.slice(0, 1).toUpperCase()}
                            </span>
                            <span className="truncate font-bold text-[#1F1A15]">
                              {p.playerName}
                            </span>
                            {p.isWinner && (
                              <Award className="h-3.5 w-3.5 shrink-0 text-[#B7791F]" />
                            )}
                          </div>

                          <div className="flex shrink-0 items-center gap-2.5 font-code text-[11px] font-bold">
                            <span className="text-[#5A5045]">
                              Petak {p.finalPosition}
                            </span>
                            <span className="rounded bg-[#E6F2EB] px-1.5 py-0.5 text-[#1D5439]">
                              Kuis {p.questionsCorrect}/{p.questionsAnswered}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </div>
  );
}
