export interface AudioPreferences {
  muted: boolean;
  bgmEnabled: boolean;
  sfxEnabled: boolean;
  bgmVolume: number; // 0..1
  sfxVolume: number; // 0..1
}

export type AudioStatusSnapshot = AudioPreferences & {
  bgmPlaying: boolean;
  bgmWanted: boolean;
  bgmDucked: boolean;
  unlocked: boolean;
  contextState: 'uninitialized' | AudioContextState;
};

export interface BgmDiagnostics {
  rms: number;
  peak: number;
  contextState: 'uninitialized' | AudioContextState;
  bgmGain: number;
  masterGain: number;
  bgmPlaying: boolean;
  scheduledNotes: number;
}

// Versi v3: memastikan preferensi lama tidak membuat BGM tersangkut mute/terlalu pelan
const STORAGE_KEY = 'ulta_audio_prefs_v3';

const DEFAULT_PREFS: AudioPreferences = {
  muted: false,
  bgmEnabled: true,
  sfxEnabled: true,
  bgmVolume: 0.75,
  sfxVolume: 0.78,
};

// Frekuensi nada (Hz) — tangga nada C Mayor / A Minor hangat
const NOTE = {
  F2: 87.31,
  G2: 98.0,
  A2: 110.0,
  B2: 123.47,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  Eb4: 311.13,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,
  C6: 1046.5,
} as const;

// 110 BPM -> 1 eighth note = 60 / 110 / 2 = 0.2727 detik
const BGM_BPM = 110;
const EIGHTH_SEC = 60 / BGM_BPM / 2;
const TOTAL_STEPS = 64; // 8 bar x 8 eighth notes

// Progresi chord hangat: Cmaj7 (2 bar) -> Am7 (2 bar) -> Fmaj7 (2 bar) -> G6 (2 bar)
const BAR_CHORDS: Array<{ bass: number; pad: number[] }> = [
  { bass: NOTE.C3, pad: [NOTE.E3, NOTE.G3, NOTE.B3] },
  { bass: NOTE.C3, pad: [NOTE.E3, NOTE.G3, NOTE.B3] },
  { bass: NOTE.A2, pad: [NOTE.C3, NOTE.E3, NOTE.G3] },
  { bass: NOTE.A2, pad: [NOTE.C3, NOTE.E3, NOTE.G3] },
  { bass: NOTE.F2, pad: [NOTE.A3, NOTE.C4, NOTE.E4] },
  { bass: NOTE.F2, pad: [NOTE.A3, NOTE.C4, NOTE.E4] },
  { bass: NOTE.G2, pad: [NOTE.B3, NOTE.D4, NOTE.E4] },
  { bass: NOTE.G2, pad: [NOTE.B3, NOTE.D4, NOTE.G4] },
];

// Melodi kalimba/marimba ceria & ringan (null = jeda napas)
const BGM_MELODY: Array<number | null> = [
  // Bar 1-2 (Cmaj7)
  NOTE.E4, null, NOTE.G4, NOTE.B4, null, NOTE.G4, NOTE.E4, null,
  NOTE.D4, NOTE.E4, NOTE.G4, null, NOTE.C5, null, NOTE.B4, null,
  // Bar 3-4 (Am7)
  NOTE.A4, null, NOTE.E4, NOTE.G4, null, NOTE.E4, NOTE.C4, null,
  NOTE.D4, NOTE.E4, NOTE.A4, null, NOTE.G4, null, NOTE.E4, null,
  // Bar 5-6 (Fmaj7)
  NOTE.F4, null, NOTE.A4, NOTE.C5, null, NOTE.A4, NOTE.F4, null,
  NOTE.E4, NOTE.F4, NOTE.A4, null, NOTE.G4, null, NOTE.E4, null,
  // Bar 7-8 (G6)
  NOTE.D4, null, NOTE.G4, NOTE.B4, null, NOTE.A4, NOTE.G4, null,
  NOTE.E4, NOTE.G4, NOTE.A4, null, NOTE.G4, null, NOTE.D4, null,
];

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function loadPreferences(): AudioPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_PREFS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<AudioPreferences>;
    return {
      muted: typeof parsed.muted === 'boolean' ? parsed.muted : DEFAULT_PREFS.muted,
      bgmEnabled:
        typeof parsed.bgmEnabled === 'boolean'
          ? parsed.bgmEnabled
          : DEFAULT_PREFS.bgmEnabled,
      sfxEnabled:
        typeof parsed.sfxEnabled === 'boolean'
          ? parsed.sfxEnabled
          : DEFAULT_PREFS.sfxEnabled,
      bgmVolume:
        typeof parsed.bgmVolume === 'number'
          ? clamp01(parsed.bgmVolume)
          : DEFAULT_PREFS.bgmVolume,
      sfxVolume:
        typeof parsed.sfxVolume === 'number'
          ? clamp01(parsed.sfxVolume)
          : DEFAULT_PREFS.sfxVolume,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function persistPreferences(prefs: AudioPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Abaikan error storage (misal private mode)
  }
}

type Listener = () => void;

/**
 * Mesin audio tabletop berbasis Web Audio API murni (0 aset eksternal):
 * - Rantai BGM: oscillator -> noteGain -> bgmGain -> bgmWarmFilter -> bgmAnalyser -> masterGain -> compressor -> destination.
 * - Menggunakan linearRampToValueAtTime yang aman (tidak pernah exponentialRamp <= 0).
 * - BGM otomatis aktif sejak interaksi klik pertama pengguna (termasuk di Landing),
 *   dengan audio ducking halus saat Kuis aktif dan auto-pause saat tab browser hidden.
 */
class TabletopAudioManager {
  private prefs: AudioPreferences = loadPreferences();
  private snapshot: AudioStatusSnapshot;
  private listeners = new Set<Listener>();

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmWarmFilter: BiquadFilterNode | null = null;
  private bgmAnalyser: AnalyserNode | null = null;
  private analyserSamples: Float32Array<ArrayBuffer> | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private unlocked = false;
  // Default aktif agar BGM langsung berputar sejak klik pertama (termasuk di Landing)
  private bgmWanted = true;
  private ducked = false;
  private tabHidden = false;

  private schedulerTimer: ReturnType<typeof setInterval> | null = null;
  private nextStepTime = 0;
  private currentStep = 0;
  private scheduledNotesCount = 0;
  private initializedBrowserHooks = false;
  private unlockHandler: (() => void) | null = null;

  constructor() {
    this.snapshot = this.buildSnapshot();
    this.initBrowserHooks();
  }

  private buildSnapshot(): AudioStatusSnapshot {
    const contextState = this.ctx ? this.ctx.state : 'uninitialized';
    const bgmPlaying = Boolean(
      this.schedulerTimer !== null &&
        this.unlocked &&
        this.bgmWanted &&
        !this.tabHidden &&
        !this.prefs.muted &&
        this.prefs.bgmEnabled &&
        this.prefs.bgmVolume > 0 &&
        contextState === 'running',
    );
    return {
      ...this.prefs,
      bgmPlaying,
      bgmWanted: this.bgmWanted,
      bgmDucked: this.ducked,
      unlocked: this.unlocked,
      contextState,
    };
  }

  public getPreferences = (): AudioPreferences => {
    return this.prefs;
  };

  public getSnapshot = (): AudioStatusSnapshot => {
    return this.snapshot;
  };

  public subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * Membaca amplitudo sinyal BGM aktual dari AnalyserNode (untuk verifikasi output non-zero).
   */
  public getBgmDiagnostics(): BgmDiagnostics {
    let rms = 0;
    let peak = 0;
    if (this.bgmAnalyser && this.analyserSamples && this.ctx?.state === 'running') {
      this.bgmAnalyser.getFloatTimeDomainData(this.analyserSamples);
      let sumSq = 0;
      for (let i = 0; i < this.analyserSamples.length; i += 1) {
        const sample = Math.abs(this.analyserSamples[i]);
        if (sample > peak) peak = sample;
        sumSq += sample * sample;
      }
      rms = Math.sqrt(sumSq / this.analyserSamples.length);
    }

    return {
      rms: Number(rms.toFixed(5)),
      peak: Number(peak.toFixed(5)),
      contextState: this.ctx ? this.ctx.state : 'uninitialized',
      bgmGain: this.bgmGain ? Number(this.bgmGain.gain.value.toFixed(3)) : 0,
      masterGain: this.masterGain ? Number(this.masterGain.gain.value.toFixed(3)) : 0,
      bgmPlaying: this.snapshot.bgmPlaying,
      scheduledNotes: this.scheduledNotesCount,
    };
  }

  private emitState(persist = false): void {
    if (persist) {
      persistPreferences(this.prefs);
    }
    this.snapshot = this.buildSnapshot();
    for (const listener of this.listeners) {
      listener();
    }
  }

  public setMuted(muted: boolean): void {
    this.prefs = { ...this.prefs, muted };
    void this.ensureUnlocked().then(() => {
      this.syncGains(0.06);
      this.syncBgmLoop(true);
      this.emitState(true);
    });
    this.syncGains(0.06);
    this.syncBgmLoop(true);
    this.emitState(true);
  }

  public toggleMute(): void {
    this.setMuted(!this.prefs.muted);
  }

  public setBgmEnabled(enabled: boolean): void {
    this.prefs = { ...this.prefs, bgmEnabled: enabled };
    void this.ensureUnlocked().then(() => {
      this.syncGains(0.08);
      this.syncBgmLoop(true);
      this.emitState(true);
    });
    this.syncGains(0.08);
    this.syncBgmLoop(true);
    this.emitState(true);
  }

  public setSfxEnabled(enabled: boolean): void {
    this.prefs = { ...this.prefs, sfxEnabled: enabled };
    void this.ensureUnlocked().then(() => {
      this.syncGains(0.06);
      this.emitState(true);
    });
    this.syncGains(0.06);
    this.emitState(true);
  }

  public setBgmVolume(volume: number): void {
    this.prefs = { ...this.prefs, bgmVolume: clamp01(volume) };
    void this.ensureUnlocked().then(() => {
      this.syncGains(0.05);
      this.syncBgmLoop(false);
      this.emitState(true);
    });
    this.syncGains(0.05);
    this.syncBgmLoop(false);
    this.emitState(true);
  }

  public setSfxVolume(volume: number): void {
    this.prefs = { ...this.prefs, sfxVolume: clamp01(volume) };
    void this.ensureUnlocked().then(() => {
      this.syncGains(0.05);
      this.emitState(true);
    });
    this.syncGains(0.05);
    this.emitState(true);
  }

  public setBgmActive(active: boolean): void {
    if (this.bgmWanted === active) return;
    this.bgmWanted = active;
    if (active && this.ctx && this.ctx.state === 'suspended' && this.unlocked && !this.tabHidden) {
      void this.ctx
        .resume()
        .then(() => {
          this.applyImmediateGains();
          this.syncBgmLoop(true);
          this.emitState(false);
        })
        .catch(() => {});
    }
    this.syncBgmLoop(true);
    this.emitState(false);
  }

  public setDucked(ducked: boolean): void {
    if (this.ducked === ducked) return;
    this.ducked = ducked;
    this.syncGains(0.22);
    this.emitState(false);
  }

  private ensureContextGraph(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (this.ctx) return this.ctx;

    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return null;

    try {
      const ctx = new AudioCtx();
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -10;
      compressor.knee.value = 16;
      compressor.ratio.value = 3;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.14;

      const masterGain = ctx.createGain();
      const bgmGain = ctx.createGain();
      const sfxGain = ctx.createGain();

      const bgmFilter = ctx.createBiquadFilter();
      bgmFilter.type = 'lowpass';
      bgmFilter.frequency.value = 4_600;
      bgmFilter.Q.value = 0.4;

      const bgmAnalyser = ctx.createAnalyser();
      bgmAnalyser.fftSize = 256;

      // Rantai BGM: oscillator -> noteGain -> bgmGain -> bgmFilter -> bgmAnalyser -> masterGain -> compressor -> destination
      bgmGain.connect(bgmFilter);
      bgmFilter.connect(bgmAnalyser);
      bgmAnalyser.connect(masterGain);

      sfxGain.connect(masterGain);
      masterGain.connect(compressor);
      compressor.connect(ctx.destination);

      this.ctx = ctx;
      this.masterGain = masterGain;
      this.bgmGain = bgmGain;
      this.sfxGain = sfxGain;
      this.bgmWarmFilter = bgmFilter;
      this.bgmAnalyser = bgmAnalyser;
      this.analyserSamples = new Float32Array(new ArrayBuffer(bgmAnalyser.fftSize * 4));
      this.noiseBuffer = this.createSoftNoiseBuffer(ctx);

      this.applyImmediateGains();
      return ctx;
    } catch {
      return null;
    }
  }

  /**
   * Membuat/melanjutkan AudioContext pada interaksi klik/keyboard pertama pengguna.
   * Menunggu `await ctx.resume()` sampai benar-benar `running`, mengeset gain nyata,
   * lalu langsung menyalakan scheduler BGM dengan reset `nextStepTime`.
   */
  public async ensureUnlocked(): Promise<boolean> {
    const ctx = this.ensureContextGraph();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        this.emitState(false);
        return false;
      }
    }

    if (ctx.state === 'running') {
      this.unlocked = true;
      this.detachUnlockListeners();
      this.applyImmediateGains();
      this.syncBgmLoop(true);
      this.emitState(false);
      return true;
    }

    this.emitState(false);
    return false;
  }

  private detachUnlockListeners(): void {
    if (!this.unlockHandler || typeof window === 'undefined') return;
    window.removeEventListener('pointerdown', this.unlockHandler);
    window.removeEventListener('keydown', this.unlockHandler);
    window.removeEventListener('click', this.unlockHandler);
    this.unlockHandler = null;
  }

  private initBrowserHooks(): void {
    if (this.initializedBrowserHooks || typeof window === 'undefined') return;
    this.initializedBrowserHooks = true;

    // Expose debug helper kecil untuk verifikasi sinyal AnalyserNode di browser
    (
      window as unknown as {
        __ultaAudioDebug?: {
          getDiagnostics: () => BgmDiagnostics;
          playBgmPreview: () => Promise<void>;
        };
      }
    ).__ultaAudioDebug = {
      getDiagnostics: () => this.getBgmDiagnostics(),
      playBgmPreview: () => this.playBgmPreview(),
    };

    this.unlockHandler = () => {
      void this.ensureUnlocked();
    };

    window.addEventListener('pointerdown', this.unlockHandler, { passive: true });
    window.addEventListener('keydown', this.unlockHandler, { passive: true });
    window.addEventListener('click', this.unlockHandler, { passive: true });

    if (typeof document !== 'undefined') {
      this.tabHidden = document.hidden;
      document.addEventListener('visibilitychange', () => {
        this.tabHidden = document.hidden;
        if (this.tabHidden) {
          this.stopBgmScheduler();
          if (this.ctx && this.ctx.state === 'running') {
            void this.ctx.suspend().catch(() => {});
          }
          this.emitState(false);
        } else if (this.ctx && this.ctx.state === 'suspended' && this.unlocked && !this.prefs.muted) {
          void this.ctx
            .resume()
            .then(() => {
              this.applyImmediateGains();
              this.syncBgmLoop(true);
              this.emitState(false);
            })
            .catch(() => {});
        } else {
          this.syncBgmLoop(true);
          this.emitState(false);
        }
      });
    }
  }

  private createSoftNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 0.08);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.35));
    }
    return buffer;
  }

  private computeTargetGains(): {
    master: number;
    bgm: number;
    sfx: number;
    cutoff: number;
  } {
    const master = this.prefs.muted ? 0 : 1;
    const duckFactor = this.ducked ? 0.32 : 1;
    // Gain BGM nyata (0.45 pada default volume 75%) agar hangat & jelas terdengar di speaker produksi
    const bgm = this.prefs.bgmEnabled
      ? this.prefs.bgmVolume * 0.6 * duckFactor
      : 0;
    const sfx = this.prefs.sfxEnabled ? this.prefs.sfxVolume * 0.85 : 0;
    const cutoff = this.ducked ? 1_900 : 4_600;
    return { master, bgm, sfx, cutoff };
  }

  private applyImmediateGains(): void {
    if (!this.ctx || !this.masterGain || !this.bgmGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const { master, bgm, sfx, cutoff } = this.computeTargetGains();

    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(master, now);

    this.bgmGain.gain.cancelScheduledValues(now);
    this.bgmGain.gain.setValueAtTime(bgm, now);

    this.sfxGain.gain.cancelScheduledValues(now);
    this.sfxGain.gain.setValueAtTime(sfx, now);

    if (this.bgmWarmFilter) {
      this.bgmWarmFilter.frequency.cancelScheduledValues(now);
      this.bgmWarmFilter.frequency.setValueAtTime(cutoff, now);
    }
  }

  private syncGains(rampSec = 0.08): void {
    if (!this.ctx || !this.masterGain || !this.bgmGain || !this.sfxGain) return;
    if (this.ctx.state !== 'running') {
      this.applyImmediateGains();
      return;
    }

    const now = this.ctx.currentTime;
    const { master, bgm, sfx, cutoff } = this.computeTargetGains();
    const end = now + Math.max(0.02, rampSec);

    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(master, end);

    this.bgmGain.gain.cancelScheduledValues(now);
    this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, now);
    this.bgmGain.gain.linearRampToValueAtTime(bgm, end);

    this.sfxGain.gain.cancelScheduledValues(now);
    this.sfxGain.gain.setValueAtTime(this.sfxGain.gain.value, now);
    this.sfxGain.gain.linearRampToValueAtTime(sfx, end);

    if (this.bgmWarmFilter) {
      this.bgmWarmFilter.frequency.cancelScheduledValues(now);
      this.bgmWarmFilter.frequency.setValueAtTime(
        this.bgmWarmFilter.frequency.value,
        now,
      );
      this.bgmWarmFilter.frequency.linearRampToValueAtTime(cutoff, end);
    }
  }

  private syncBgmLoop(resetClock = false): void {
    const shouldPlay =
      this.unlocked &&
      this.bgmWanted &&
      !this.tabHidden &&
      !this.prefs.muted &&
      this.prefs.bgmEnabled &&
      this.prefs.bgmVolume > 0 &&
      this.ctx?.state === 'running';

    if (!shouldPlay) {
      this.stopBgmScheduler();
      return;
    }

    if (!this.ctx) return;

    if (resetClock || this.schedulerTimer === null) {
      this.nextStepTime = this.ctx.currentTime + 0.05;
    }

    if (this.schedulerTimer === null) {
      this.schedulerTimer = setInterval(() => {
        this.scheduleBgmLookahead();
      }, 65);
      this.scheduleBgmLookahead();
    }
  }

  private stopBgmScheduler(): void {
    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  private scheduleBgmLookahead(): void {
    if (!this.ctx || !this.bgmGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    if (this.nextStepTime < now - 0.1) {
      this.nextStepTime = now + 0.05;
    }

    const lookaheadEnd = now + 0.22;
    while (this.nextStepTime < lookaheadEnd) {
      this.scheduleBgmStep(this.currentStep, this.nextStepTime);
      this.nextStepTime += EIGHTH_SEC;
      this.currentStep = (this.currentStep + 1) % TOTAL_STEPS;
    }
  }

  private scheduleBgmStep(step: number, time: number): void {
    if (!this.ctx || !this.bgmGain) return;
    const bar = Math.floor(step / 8);
    const beatInBar = step % 8;
    const chord = BAR_CHORDS[bar];

    // 1. Bass hangat lembut (ketukan 1 & ketukan 3.5)
    if (beatInBar === 0 || beatInBar === 5) {
      this.playTone(this.bgmGain, {
        freq: chord.bass,
        type: 'sine',
        start: time,
        duration: beatInBar === 0 ? 0.52 : 0.34,
        gain: 0.38,
        attack: 0.015,
      });
    }

    // 2. Chord harp/kalimba hangat lembut di awal setiap bar
    if (beatInBar === 0) {
      chord.pad.forEach((freq, idx) => {
        this.playTone(this.bgmGain!, {
          freq,
          type: 'triangle',
          start: time + idx * 0.025,
          duration: 0.78,
          gain: 0.145,
          attack: 0.016,
        });
      });
    }

    // 3. Melodi marimba/kalimba ceria
    const melodyFreq = BGM_MELODY[step];
    if (melodyFreq) {
      this.playTone(this.bgmGain, {
        freq: melodyFreq,
        type: 'triangle',
        start: time,
        duration: 0.28,
        gain: 0.3,
        attack: 0.008,
      });
      this.playTone(this.bgmGain, {
        freq: melodyFreq * 2,
        type: 'sine',
        start: time,
        duration: 0.13,
        gain: 0.065,
        attack: 0.006,
      });
    }

    // 4. Perkusi woodblock kayu ringan di off-beat
    if (beatInBar === 2 || beatInBar === 6) {
      this.playWoodTap(this.bgmGain, time, beatInBar === 2 ? 980 : 1240, 0.085);
    }

    this.scheduledNotesCount += 1;
  }

  /**
   * Preview 1 bar melodi BGM langsung lewat tombol "Tes Musik" di popover audio.
   */
  public async playBgmPreview(): Promise<void> {
    const ok = await this.ensureUnlocked();
    if (!ok || !this.ctx || !this.bgmGain) return;

    // Pastikan tidak dibisukan untuk preview 1 bar
    if (this.prefs.muted) {
      this.prefs = { ...this.prefs, muted: false };
    }
    if (!this.prefs.bgmEnabled) {
      this.prefs = { ...this.prefs, bgmEnabled: true };
    }
    if (this.prefs.bgmVolume < 0.2) {
      this.prefs = { ...this.prefs, bgmVolume: 0.7 };
    }
    this.applyImmediateGains();

    const startBase = this.ctx.currentTime + 0.03;
    for (let step = 0; step < 8; step += 1) {
      this.scheduleBgmStep(step, startBase + step * EIGHTH_SEC);
    }
    this.syncBgmLoop(true);
    this.emitState(true);
  }

  private canPlaySfx(): boolean {
    if (this.tabHidden) return false;
    if (this.prefs.muted || !this.prefs.sfxEnabled || this.prefs.sfxVolume <= 0) {
      return false;
    }
    if (!this.ctx || !this.sfxGain) return false;
    if (this.ctx.state !== 'running') return false;
    return true;
  }

  /**
   * Memutar 1 nada murni sine/triangle dengan amplop linear yang aman
   * (tidak pernah memanggil exponentialRampToValueAtTime <= 0).
   */
  private playTone(
    destination: AudioNode,
    opts: {
      freq: number;
      endFreq?: number;
      type: 'sine' | 'triangle';
      start: number;
      duration: number;
      gain: number;
      attack?: number;
    },
  ): void {
    if (!this.ctx) return;
    const safeStart = Math.max(this.ctx.currentTime, opts.start);
    const safeFreq = Math.max(40, opts.freq);
    const attack = Math.min(opts.attack ?? 0.01, opts.duration * 0.45);
    const safeDuration = Math.max(attack + 0.02, opts.duration);
    const peakGain = Math.max(0.001, opts.gain);

    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();

    osc.type = opts.type;
    osc.frequency.setValueAtTime(safeFreq, safeStart);
    if (opts.endFreq !== undefined) {
      osc.frequency.linearRampToValueAtTime(
        Math.max(40, opts.endFreq),
        safeStart + safeDuration,
      );
    }

    env.gain.setValueAtTime(0, safeStart);
    env.gain.linearRampToValueAtTime(peakGain, safeStart + attack);
    env.gain.linearRampToValueAtTime(peakGain * 0.35, safeStart + safeDuration * 0.65);
    env.gain.linearRampToValueAtTime(0, safeStart + safeDuration);

    osc.connect(env);
    env.connect(destination);

    osc.start(safeStart);
    osc.stop(safeStart + safeDuration + 0.025);
  }

  private playWoodTap(
    destination: AudioNode,
    time: number,
    freq: number,
    gain: number,
  ): void {
    if (!this.ctx) return;
    const safeTime = Math.max(this.ctx.currentTime, time);

    this.playTone(destination, {
      freq,
      endFreq: freq * 0.62,
      type: 'sine',
      start: safeTime,
      duration: 0.045,
      gain,
      attack: 0.003,
    });

    if (this.noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq * 1.4;
      filter.Q.value = 3.5;

      const env = this.ctx.createGain();
      env.gain.setValueAtTime(gain * 0.45, safeTime);
      env.gain.linearRampToValueAtTime(0, safeTime + 0.032);

      src.connect(filter);
      filter.connect(env);
      env.connect(destination);
      src.start(safeTime);
      src.stop(safeTime + 0.04);
    }
  }

  // ============================================================================
  // 11 SFX Tabletop — Warm, Playful, Non-Harsh
  // ============================================================================

  public playUiClick(): void {
    void this.ensureUnlocked().then((ok) => {
      if (!ok || !this.canPlaySfx() || !this.ctx || !this.sfxGain) return;
      this.playWoodTap(this.sfxGain, this.ctx.currentTime, 640, 0.2);
    });
  }

  public playTurnStart(isMyTurn: boolean): void {
    if (!this.canPlaySfx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    if (isMyTurn) {
      this.playTone(this.sfxGain, {
        freq: NOTE.E5,
        type: 'triangle',
        start: now,
        duration: 0.2,
        gain: 0.26,
        attack: 0.008,
      });
      this.playTone(this.sfxGain, {
        freq: NOTE.A5,
        type: 'triangle',
        start: now + 0.11,
        duration: 0.34,
        gain: 0.28,
        attack: 0.008,
      });
      this.playTone(this.sfxGain, {
        freq: NOTE.C6,
        type: 'sine',
        start: now + 0.11,
        duration: 0.22,
        gain: 0.09,
        attack: 0.008,
      });
    } else {
      this.playTone(this.sfxGain, {
        freq: NOTE.C5,
        type: 'sine',
        start: now,
        duration: 0.16,
        gain: 0.16,
      });
      this.playTone(this.sfxGain, {
        freq: NOTE.G4,
        type: 'sine',
        start: now + 0.1,
        duration: 0.22,
        gain: 0.14,
      });
    }
  }

  public playDiceRoll(durationMs = 800): void {
    if (!this.canPlaySfx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const totalSec = Math.max(0.35, durationMs / 1000);
    const offsets = [0, 0.07, 0.14, 0.22, 0.31, 0.42, 0.55, 0.72];
    const pitches = [520, 690, 460, 740, 560, 640, 490, 420];

    offsets.forEach((rel, idx) => {
      const t = now + rel * (totalSec / 0.8);
      const gain = idx === offsets.length - 1 ? 0.24 : 0.15 + (idx % 2) * 0.04;
      this.playWoodTap(this.sfxGain!, t, pitches[idx], gain);
    });
  }

  public playPawnStep(stepIndex = 0): void {
    if (!this.canPlaySfx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const scaleSteps = [0, 2, 4, 7, 9, 12];
    const semitones = scaleSteps[Math.min(stepIndex, scaleSteps.length - 1)];
    const freq = 340 * Math.pow(2, semitones / 12);

    this.playWoodTap(this.sfxGain, now, freq, 0.24);
    this.playTone(this.sfxGain, {
      freq: freq * 1.15,
      endFreq: freq * 1.35,
      type: 'sine',
      start: now + 0.01,
      duration: 0.07,
      gain: 0.11,
      attack: 0.005,
    });
  }

  public playLadderClimb(): void {
    if (!this.canPlaySfx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [NOTE.C5, NOTE.D5, NOTE.E5, NOTE.G5, NOTE.A5, NOTE.C6];

    notes.forEach((freq, idx) => {
      const start = now + idx * 0.075;
      this.playTone(this.sfxGain!, {
        freq,
        type: 'triangle',
        start,
        duration: 0.28,
        gain: 0.22,
        attack: 0.008,
      });
      this.playTone(this.sfxGain!, {
        freq: freq * 2,
        type: 'sine',
        start,
        duration: 0.14,
        gain: 0.05,
        attack: 0.006,
      });
    });
  }

  public playSnakeSlide(): void {
    if (!this.canPlaySfx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const env = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.linearRampToValueAtTime(190, now + 0.52);

    lfo.type = 'sine';
    lfo.frequency.value = 11;
    lfoGain.gain.value = 18;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.24, now + 0.03);
    env.gain.linearRampToValueAtTime(0, now + 0.56);

    osc.connect(env);
    env.connect(this.sfxGain);

    osc.start(now);
    lfo.start(now);
    osc.stop(now + 0.58);
    lfo.stop(now + 0.58);

    this.playWoodTap(this.sfxGain, now + 0.5, 240, 0.22);
  }

  public playQuizOpen(): void {
    if (!this.canPlaySfx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [NOTE.G4, NOTE.B4, NOTE.D5, NOTE.G5];

    notes.forEach((freq, idx) => {
      this.playTone(this.sfxGain!, {
        freq,
        type: 'triangle',
        start: now + idx * 0.065,
        duration: 0.24,
        gain: 0.22,
        attack: 0.007,
      });
    });
  }

  public playQuizTick(secondsLeft: number): void {
    if (!this.canPlaySfx() || !this.ctx || !this.sfxGain) return;
    const freq = secondsLeft <= 2 ? 1_180 : 940;
    this.playWoodTap(this.sfxGain, this.ctx.currentTime, freq, 0.16);
  }

  public playQuizCorrect(): void {
    void this.ensureUnlocked().then((ok) => {
      if (!ok || !this.canPlaySfx() || !this.ctx || !this.sfxGain) return;
      const now = this.ctx.currentTime;
      const arpeggio = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6];

      arpeggio.forEach((freq, idx) => {
        this.playTone(this.sfxGain!, {
          freq,
          type: 'triangle',
          start: now + idx * 0.07,
          duration: 0.36,
          gain: 0.24,
          attack: 0.008,
        });
      });

      [NOTE.E5, NOTE.G5, NOTE.C6].forEach((freq) => {
        this.playTone(this.sfxGain!, {
          freq,
          type: 'sine',
          start: now + 0.21,
          duration: 0.55,
          gain: 0.11,
          attack: 0.02,
        });
      });
    });
  }

  public playQuizWrong(): void {
    if (!this.canPlaySfx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    this.playTone(this.sfxGain, {
      freq: NOTE.Eb4,
      endFreq: NOTE.D4,
      type: 'triangle',
      start: now,
      duration: 0.2,
      gain: 0.22,
      attack: 0.012,
    });
    this.playTone(this.sfxGain, {
      freq: NOTE.C4,
      endFreq: NOTE.B2 * 1.9,
      type: 'triangle',
      start: now + 0.18,
      duration: 0.34,
      gain: 0.22,
      attack: 0.015,
    });
  }

  public playGameOver(): void {
    if (!this.canPlaySfx() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const melody = [
      { freq: NOTE.C5, at: 0, dur: 0.18 },
      { freq: NOTE.E5, at: 0.12, dur: 0.18 },
      { freq: NOTE.G5, at: 0.24, dur: 0.2 },
      { freq: NOTE.C6, at: 0.38, dur: 0.55 },
      { freq: NOTE.G5, at: 0.56, dur: 0.2 },
      { freq: NOTE.C6, at: 0.72, dur: 0.75 },
    ];

    melody.forEach((n) => {
      this.playTone(this.sfxGain!, {
        freq: n.freq,
        type: 'triangle',
        start: now + n.at,
        duration: n.dur,
        gain: 0.25,
        attack: 0.01,
      });
    });

    [NOTE.C4, NOTE.G4, NOTE.B4, NOTE.D5, NOTE.E5].forEach((freq, idx) => {
      this.playTone(this.sfxGain!, {
        freq,
        type: 'sine',
        start: now + 0.72 + idx * 0.03,
        duration: 0.9,
        gain: 0.09,
        attack: 0.02,
      });
    });
  }
}

export const audioManager = new TabletopAudioManager();
