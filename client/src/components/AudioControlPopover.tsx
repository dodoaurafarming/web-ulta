import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  Music,
  SlidersHorizontal,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { audioManager } from '../services/audioManager';

interface AudioControlPopoverProps {
  compact?: boolean;
}

export function AudioControlPopover({
  compact = false,
}: AudioControlPopoverProps) {
  const audio = useSyncExternalStore(
    audioManager.subscribe,
    audioManager.getSnapshot,
    audioManager.getSnapshot,
  );
  const [open, setOpen] = useState(false);
  const [bgmMeter, setBgmMeter] = useState({
    rms: 0,
    peak: 0,
    maxRms: 0,
    scheduledNotes: 0,
  });
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sampel level nyata dari AnalyserNode saat BGM/AudioContext aktif
  useEffect(() => {
    if (!audio.bgmPlaying && !open) {
      setBgmMeter((prev) =>
        prev.rms === 0 && prev.peak === 0
          ? prev
          : { ...prev, rms: 0, peak: 0 },
      );
      return;
    }

    const poll = () => {
      const diag = audioManager.getBgmDiagnostics();
      setBgmMeter((prev) => ({
        rms: diag.rms,
        peak: diag.peak,
        maxRms: Math.max(prev.maxRms, diag.rms),
        scheduledNotes: diag.scheduledNotes,
      }));
    };

    poll();
    const timer = window.setInterval(poll, 160);
    return () => window.clearInterval(timer);
  }, [audio.bgmPlaying, open]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const isEffectivelyMuted =
    audio.muted || (!audio.bgmEnabled && !audio.sfxEnabled);

  const bgmStatusText = audio.muted
    ? 'Dibisukan'
    : !audio.bgmEnabled || audio.bgmVolume === 0
      ? 'Nonaktif'
      : audio.bgmPlaying
        ? audio.bgmDucked
          ? 'Aktif (mode kuis)'
          : 'Aktif (110 BPM)'
        : 'Menunggu klik pertama';

  return (
    <div ref={containerRef} className="relative flex items-center gap-1">
      {/* Tombol Mute/Unmute Cepat + Indikator BGM aktif */}
      <button
        type="button"
        onClick={() => {
          audioManager.toggleMute();
          if (audio.muted) {
            audioManager.playUiClick();
          }
        }}
        title={
          isEffectivelyMuted
            ? 'Aktifkan suara'
            : audio.bgmPlaying
              ? 'BGM aktif — klik untuk bisukan'
              : 'Bisukan semua suara'
        }
        aria-label={isEffectivelyMuted ? 'Aktifkan suara' : 'Bisukan semua suara'}
        data-bgm-playing={audio.bgmPlaying ? 'true' : 'false'}
        data-bgm-rms={bgmMeter.rms.toFixed(4)}
        data-bgm-peak={bgmMeter.peak.toFixed(4)}
        data-bgm-max-rms={bgmMeter.maxRms.toFixed(4)}
        data-bgm-notes={String(bgmMeter.scheduledNotes)}
        data-audio-ctx={audio.contextState}
        className={`btn-tactile relative inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold cursor-pointer ${
          isEffectivelyMuted
            ? 'border-[#E7B5A9] bg-[#FCEBE7] text-[#8F2F1E]'
            : audio.bgmPlaying
              ? 'border-[#BBDAC8] bg-[#E6F2EB] text-[#1D5439]'
              : 'border-[#D5C7B2] bg-[#FFFDF8] text-[#1F1A15] hover:bg-[#EFE6D6]'
        }`}
      >
        {isEffectivelyMuted ? (
          <VolumeX className="h-3.5 w-3.5" />
        ) : (
          <Volume2 className="h-3.5 w-3.5 text-[#266D4B]" />
        )}
        {audio.bgmPlaying && (
          <span
            className="h-1.5 w-1.5 rounded-full bg-[#266D4B] animate-pulse"
            aria-hidden="true"
          />
        )}
      </button>

      {/* Tombol Popover Pengaturan BGM & SFX */}
      <button
        type="button"
        onClick={() => {
          audioManager.playUiClick();
          setOpen((prev) => !prev);
        }}
        aria-expanded={open}
        aria-label="Pengaturan volume BGM dan SFX"
        title={`Pengaturan Audio — BGM: ${bgmStatusText}`}
        className={`btn-tactile inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold cursor-pointer ${
          open
            ? 'border-[#1F1A15] bg-[#1F1A15] text-[#FFFDF8]'
            : 'border-[#D5C7B2] bg-[#FFFDF8] text-[#605549] hover:bg-[#EFE6D6] hover:text-[#1F1A15]'
        }`}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        {!compact && <span className="hidden lg:inline">Audio</span>}
      </button>

      {/* Popover Pengaturan Audio Tabletop */}
      {open && (
        <div
          role="dialog"
          aria-label="Pengaturan Audio"
          className="animate-popup-in absolute right-0 top-full mt-2 z-50 w-68 rounded-xl border-[1.5px] border-[#352517] bg-[#FFFDF8] p-3.5 text-[#1F1A15] shadow-[0_5px_0_0_#352517,0_14px_24px_-8px_rgba(31,26,21,0.3)] space-y-3.5"
        >
          <div className="flex items-center justify-between border-b border-[#E5DAC7] pb-2">
            <div>
              <span className="font-display text-sm font-extrabold text-[#1F1A15]">
                Pengaturan audio
              </span>
              <p className="text-[11px] font-medium text-[#605549]">
                BGM: <strong className={audio.bgmPlaying ? 'text-[#1D5439]' : 'text-[#605549]'}>{bgmStatusText}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => audioManager.toggleMute()}
              className={`rounded-md border px-2 py-0.5 text-[11px] font-bold cursor-pointer ${
                audio.muted
                  ? 'border-[#E7B5A9] bg-[#FCEBE7] text-[#8F2F1E]'
                  : 'border-[#BBDAC8] bg-[#E6F2EB] text-[#1D5439]'
              }`}
            >
              {audio.muted ? 'Dibisukan' : 'Aktif'}
            </button>
          </div>

          {/* Kontrol BGM */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label
                htmlFor="audio-bgm-slider"
                className="inline-flex items-center gap-1.5 font-bold text-[#1F1A15]"
              >
                <Music className="h-3.5 w-3.5 text-[#B7791F]" />
                <span>Musik latar (BGM)</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  audioManager.setBgmEnabled(!audio.bgmEnabled);
                  audioManager.playUiClick();
                }}
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold cursor-pointer ${
                  audio.bgmEnabled
                    ? 'bg-[#266D4B] text-[#FFFDF8]'
                    : 'bg-[#E8DEC9] text-[#605549]'
                }`}
              >
                {audio.bgmEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="audio-bgm-slider"
                type="range"
                min={0}
                max={100}
                value={Math.round(audio.bgmVolume * 100)}
                disabled={audio.muted || !audio.bgmEnabled}
                onChange={(e) =>
                  audioManager.setBgmVolume(Number(e.target.value) / 100)
                }
                className="h-1.5 w-full accent-[#266D4B] cursor-pointer disabled:opacity-40"
              />
              <span className="w-8 text-right font-code text-[11px] font-bold text-[#605549]">
                {Math.round(audio.bgmVolume * 100)}%
              </span>
            </div>
            {/* Indikator sinyal BGM nyata dari AnalyserNode */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div
                aria-hidden="true"
                className="flex h-2.5 flex-1 items-end gap-0.5 overflow-hidden rounded bg-[#EFE6D6] px-1 py-0.5"
              >
                {[0.18, 0.32, 0.48, 0.65, 0.82, 1.0].map((threshold, idx) => {
                  const normalized = Math.min(1, bgmMeter.peak * 4.5);
                  const active = audio.bgmPlaying && normalized >= threshold * 0.4;
                  return (
                    <span
                      key={idx}
                      className={`h-full flex-1 rounded-xs transition-colors ${
                        active ? 'bg-[#266D4B]' : 'bg-[#D5C7B2]/60'
                      }`}
                    />
                  );
                })}
              </div>
              <span className="font-code text-[10px] font-semibold text-[#605549]">
                {audio.bgmPlaying
                  ? `RMS ${bgmMeter.rms.toFixed(3)}`
                  : 'Siaga'}
              </span>
            </div>
          </div>

          {/* Kontrol SFX */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label
                htmlFor="audio-sfx-slider"
                className="inline-flex items-center gap-1.5 font-bold text-[#1F1A15]"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#C44B34]" />
                <span>Efek suara (SFX)</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  const next = !audio.sfxEnabled;
                  audioManager.setSfxEnabled(next);
                  if (next) audioManager.playUiClick();
                }}
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold cursor-pointer ${
                  audio.sfxEnabled
                    ? 'bg-[#C44B34] text-[#FFFDF8]'
                    : 'bg-[#E8DEC9] text-[#605549]'
                }`}
              >
                {audio.sfxEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="audio-sfx-slider"
                type="range"
                min={0}
                max={100}
                value={Math.round(audio.sfxVolume * 100)}
                disabled={audio.muted || !audio.sfxEnabled}
                onChange={(e) =>
                  audioManager.setSfxVolume(Number(e.target.value) / 100)
                }
                className="h-1.5 w-full accent-[#C44B34] cursor-pointer disabled:opacity-40"
              />
              <span className="w-8 text-right font-code text-[11px] font-bold text-[#605549]">
                {Math.round(audio.sfxVolume * 100)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void audioManager.playBgmPreview()}
              className="btn-tactile inline-flex items-center justify-center gap-1 rounded-lg border border-[#BBDAC8] bg-[#E6F2EB] py-1.5 text-xs font-bold text-[#1D5439] hover:bg-[#D5EAD9] cursor-pointer"
            >
              <Music className="h-3.5 w-3.5" />
              <span>Tes Musik</span>
            </button>
            <button
              type="button"
              onClick={() => audioManager.playQuizCorrect()}
              disabled={isEffectivelyMuted || !audio.sfxEnabled}
              className="btn-tactile inline-flex items-center justify-center gap-1 rounded-lg border border-[#D5C7B2] bg-[#EFE6D6] py-1.5 text-xs font-bold text-[#1F1A15] hover:bg-[#E5DAC7] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#C44B34]" />
              <span>Tes SFX</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
