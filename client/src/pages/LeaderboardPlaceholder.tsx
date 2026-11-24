import { ArrowLeft, Database, History, Trophy } from 'lucide-react';

interface LeaderboardPlaceholderProps {
  onBackToGame: () => void;
}

export function LeaderboardPlaceholder({
  onBackToGame,
}: LeaderboardPlaceholderProps) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="rounded-3xl border-2 border-indigo-200 bg-white/95 p-6 text-center shadow-xl sm:p-10 space-y-5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
          <Trophy className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-extrabold text-indigo-700">
            <Database className="h-3.5 w-3.5" />
            <span>Integrasi Prisma + TiDB Cloud — Tahap 5</span>
          </span>
          <h1 className="font-display text-3xl font-bold text-slate-900">
            Leaderboard & Riwayat Pertandingan
          </h1>
          <p className="mx-auto max-w-lg text-sm font-medium text-slate-600">
            Halaman ini akan menampilkan papan peringkat pemain (total main,
            kemenangan, win rate, akurasi kuis IT) serta riwayat pertandingan
            dari REST API <code>/api/leaderboard</code> dan{' '}
            <code>/api/matches</code> pada Tahap 5.
          </p>
        </div>

        <div className="mx-auto grid max-w-lg grid-cols-2 gap-3 text-left">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5">
            <Trophy className="h-5 w-5 text-amber-600 mb-1.5" />
            <p className="text-xs font-extrabold text-slate-900">
              Top Leaderboard
            </p>
            <p className="text-[11px] text-slate-600">
              Peringkat & statistik akurasi kuis
            </p>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-3.5">
            <History className="h-5 w-5 text-sky-600 mb-1.5" />
            <p className="text-xs font-extrabold text-slate-900">
              Riwayat Match
            </p>
            <p className="text-[11px] text-slate-600">
              Kode room, peserta, & pemenang
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBackToGame}
          className="btn-tactile inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_3px_0_0_#3730a3] hover:bg-indigo-700 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Permainan</span>
        </button>
      </div>
    </div>
  );
}
