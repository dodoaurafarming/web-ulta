import { ArrowLeft, Database, History, Trophy } from 'lucide-react';

interface LeaderboardPlaceholderProps {
  onBackToGame: () => void;
}

export function LeaderboardPlaceholder({
  onBackToGame,
}: LeaderboardPlaceholderProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="surface-card rounded-2xl p-6 text-center sm:p-9 space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[#E5C068] bg-[#FDF3D7] text-[#B7791F]">
          <Trophy className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-[#D9CEBC] bg-[#F3ECE0] px-3 py-1 text-xs font-bold text-[#5A5045]">
            <Database className="h-3.5 w-3.5 text-[#2F7D57]" />
            <span>Integrasi Prisma + TiDB Cloud — Tahap 5</span>
          </span>
          <h1 className="font-display text-2xl font-extrabold text-[#1F1B17] sm:text-3xl">
            Leaderboard & Riwayat Pertandingan
          </h1>
          <p className="mx-auto max-w-lg text-sm font-medium text-[#645A4E] leading-relaxed">
            Halaman ini akan menampilkan papan peringkat pemain (total main,
            kemenangan, win rate, dan akurasi kuis IT) serta riwayat
            pertandingan dari API <code>/api/leaderboard</code> dan{' '}
            <code>/api/matches</code> pada Tahap 5.
          </p>
        </div>

        <div className="mx-auto grid max-w-lg grid-cols-1 gap-3 text-left sm:grid-cols-2">
          <div className="rounded-xl border border-[#E7CB82] bg-[#FDF4DC] p-3.5">
            <Trophy className="h-4.5 w-4.5 text-[#B7791F] mb-1.5" />
            <p className="text-xs font-bold text-[#1F1B17]">Top Leaderboard</p>
            <p className="text-[11px] text-[#5A5045]">
              Peringkat pemain & akurasi kuis IT
            </p>
          </div>
          <div className="rounded-xl border border-[#C6DFD0] bg-[#EBF5EF] p-3.5">
            <History className="h-4.5 w-4.5 text-[#2F7D57] mb-1.5" />
            <p className="text-xs font-bold text-[#1F1B17]">Riwayat Match</p>
            <p className="text-[11px] text-[#5A5045]">
              Kode room, peserta, & pemenang
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBackToGame}
          className="btn-tactile inline-flex items-center gap-2 rounded-xl border-[1.5px] border-[#1F1B17] bg-[#1F1B17] px-5 py-2.5 text-sm font-bold text-[#FFFDF8] shadow-[0_3px_0_0_#4A3F35] hover:bg-[#332A22] cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Permainan</span>
        </button>
      </div>
    </div>
  );
}
