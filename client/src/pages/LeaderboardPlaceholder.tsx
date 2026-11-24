import { ArrowLeft, Database, Trophy } from 'lucide-react';

interface LeaderboardPlaceholderProps {
  onBackToGame: () => void;
}

export function LeaderboardPlaceholder({
  onBackToGame,
}: LeaderboardPlaceholderProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <section className="studio-panel overflow-hidden rounded-2xl">
        <div className="border-b border-[#352517] bg-[#2A1E15] px-6 py-5 text-[#FFFDF8] flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5C068] bg-[#3A2B1F] text-[#F7E3AC]">
            <Trophy className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-xl font-extrabold">
              Leaderboard & Riwayat Pertandingan
            </h1>
            <p className="text-xs text-[#D4C7B4]">
              Akan dihubungkan ke REST API Prisma + TiDB Cloud pada Tahap 5
            </p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-[#5A5045] leading-relaxed">
            Halaman ini akan menampilkan peringkat kemenangan pemain, akurasi
            kuis IT, serta daftar riwayat pertandingan terbaru dari endpoint{' '}
            <code className="font-code text-xs bg-[#EFE6D6] px-1.5 py-0.5 rounded">
              /api/leaderboard
            </code>{' '}
            dan{' '}
            <code className="font-code text-xs bg-[#EFE6D6] px-1.5 py-0.5 rounded">
              /api/matches
            </code>
            .
          </p>

          <div className="flex items-center gap-2 text-xs font-semibold text-[#1D5439]">
            <Database className="h-4 w-4" />
            <span>Skema database dan endpoint API sudah siap sejak Tahap 2.</span>
          </div>

          <button
            type="button"
            onClick={onBackToGame}
            className="btn-tactile inline-flex items-center gap-2 rounded-xl border-2 border-[#1F1A15] bg-[#1F1A15] px-4 py-2.5 text-sm font-bold text-[#FFFDF8] shadow-[0_3px_0_0_#4A3E33] hover:bg-[#332A22] cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Permainan</span>
          </button>
        </div>
      </section>
    </div>
  );
}
