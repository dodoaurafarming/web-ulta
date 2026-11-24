import { Dices, TrendingDown, TrendingUp } from 'lucide-react';
import type { StageBanner } from '../hooks/usePresentationQueue';
import { getPlayerPalette } from '../utils/boardGeometry';

interface StagePopupOverlayProps {
  banner: StageBanner | null;
}

/**
 * Pop-up pengumuman tengah papan untuk tempo permainan yang santai:
 * - Pengumuman giliran ("GILIRAN KAMU!" atau "Giliran [Nama]...")
 * - Pengumuman efek Ular / Tangga sebelum pion meluncur ke petak tujuan.
 */
export function StagePopupOverlay({ banner }: StagePopupOverlayProps) {
  if (!banner) return null;

  if (banner.kind === 'TURN') {
    const palette = getPlayerPalette(banner.colorIndex);
    const isMe = banner.isMe;

    return (
      <div
        role="status"
        aria-live="assertive"
        data-stage-popup="TURN"
        className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center p-4"
      >
        <div
          className={`animate-popup-in flex items-center gap-3.5 rounded-2xl border-2 px-5 py-3.5 sm:px-7 sm:py-4 ${
            isMe
              ? 'border-[#8A2E1D] bg-[#FFFDF8] text-[#1F1A15] shadow-[0_6px_0_0_#8A2E1D,0_20px_32px_-10px_rgba(31,26,21,0.45)]'
              : 'border-[#2F2014] bg-[#2A1E15] text-[#FFFDF8] shadow-[0_6px_0_0_#1A110A,0_20px_32px_-10px_rgba(31,26,21,0.45)]'
          }`}
        >
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#FFFDF8] text-[#FFFDF8] font-display text-lg font-extrabold shadow-sm ${palette.bg}`}
          >
            {isMe ? (
              <Dices className="h-5.5 w-5.5" />
            ) : (
              banner.playerName.slice(0, 1).toUpperCase()
            )}
          </span>
          <div>
            <p className="font-display text-xl font-extrabold leading-tight sm:text-2xl">
              {isMe ? 'GILIRAN KAMU!' : `Giliran ${banner.playerName}...`}
            </p>
            <p
              className={`mt-0.5 text-xs font-semibold ${
                isMe ? 'text-[#C44B34]' : 'text-[#D6CBB9]'
              }`}
            >
              {isMe
                ? 'Tekan Lempar Dadu untuk melangkah'
                : 'Menunggu pemain melempar dadu'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isLadder = banner.effect === 'LADDER';

  return (
    <div
      role="status"
      aria-live="assertive"
      data-stage-popup={banner.effect}
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center p-4"
    >
      <div
        className={`animate-popup-in flex items-center gap-3.5 rounded-2xl border-2 px-5 py-3.5 sm:px-7 sm:py-4 ${
          isLadder
            ? 'border-[#1B4F36] bg-[#E6F2EB] text-[#143D29] shadow-[0_6px_0_0_#1B4F36,0_20px_32px_-10px_rgba(20,61,41,0.42)]'
            : 'border-[#8A2E1D] bg-[#FCEBE7] text-[#6B2114] shadow-[0_6px_0_0_#8A2E1D,0_20px_32px_-10px_rgba(107,33,20,0.42)]'
        }`}
      >
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#FFFDF8] ${
            isLadder ? 'bg-[#266D4B]' : 'bg-[#C44B34]'
          }`}
        >
          {isLadder ? (
            <TrendingUp className="h-6 w-6" />
          ) : (
            <TrendingDown className="h-6 w-6" />
          )}
        </span>
        <div>
          <p className="font-display text-xl font-extrabold leading-tight sm:text-2xl">
            {isLadder ? 'NAIK TANGGA!' : 'TERGIGIT ULAR!'}
          </p>
          <p className="mt-0.5 text-xs font-bold sm:text-sm">
            {isLadder
              ? `${banner.playerName} melesat: Petak ${banner.from} → ${banner.to}`
              : `${banner.playerName} turun ke petak ${banner.to} (dari ${banner.from})`}
          </p>
        </div>
      </div>
    </div>
  );
}
