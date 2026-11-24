import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Brain,
  Clock,
  FlaskConical,
  KeyRound,
  PlusCircle,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import type { ConnectionStatus } from '../types/protocol';

interface LandingPageProps {
  initialName: string;
  connectionStatus: ConnectionStatus;
  mockMode: boolean;
  wsUrl: string;
  onCreateRoom: (playerName: string, maxPlayers: number) => void;
  onJoinRoom: (playerName: string, roomCode: string) => void;
  onEnableMockMode: () => void;
}

const CAPACITY_OPTIONS = [2, 3, 4, 5] as const;

/** Cuplikan geometris papan mini khas ULTA — memperkuat identitas tabletop tanpa template metrik. */
function MiniBoardSpecimen() {
  const tiles = [
    { n: 24, bg: '#FCEBE6', accent: '#C44B34' },
    { n: 23, bg: '#FFFDF8', accent: '#605549' },
    { n: 22, bg: '#FDF3D7', accent: '#8A580F' },
    { n: 21, bg: '#F2E9D9', accent: '#605549' },
    { n: 17, bg: '#F2E9D9', accent: '#605549' },
    { n: 18, bg: '#FFFDF8', accent: '#605549' },
    { n: 19, bg: '#E7F3EC', accent: '#1D5439' },
    { n: 20, bg: '#FFFDF8', accent: '#605549' },
    { n: 16, bg: '#FFFDF8', accent: '#605549' },
    { n: 15, bg: '#E7F3EC', accent: '#1D5439' },
    { n: 14, bg: '#F2E9D9', accent: '#605549' },
    { n: 13, bg: '#FFFDF8', accent: '#605549' },
  ];

  return (
    <div
      className="board-wood-frame relative w-full max-w-[340px] rounded-2xl p-2"
      aria-hidden="true"
    >
      <div className="relative overflow-hidden rounded-xl border-2 border-[#E3D3B8] bg-[#FAF5EB]">
        <div className="grid grid-cols-4 grid-rows-3 aspect-[4/3]">
          {tiles.map((t) => (
            <div
              key={t.n}
              style={{ backgroundColor: t.bg }}
              className="border border-[#DDD1BE] p-1.5 flex items-start justify-between"
            >
              <span
                style={{ color: t.accent }}
                className="font-display text-xs font-bold leading-none"
              >
                {t.n}
              </span>
            </div>
          ))}
        </div>

        {/* Tangga & Ular geometris bersih */}
        <svg
          viewBox="0 0 400 300"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          {/* Ladder 15 -> 19 */}
          <g strokeLinecap="round">
            <line x1="150" y1="255" x2="248" y2="148" stroke="#1C5439" strokeWidth="6" />
            <line x1="168" y1="265" x2="266" y2="158" stroke="#1C5439" strokeWidth="6" />
            <line x1="156" y1="238" x2="174" y2="248" stroke="#A67442" strokeWidth="5" />
            <line x1="181" y1="211" x2="199" y2="221" stroke="#A67442" strokeWidth="5" />
            <line x1="206" y1="184" x2="224" y2="194" stroke="#A67442" strokeWidth="5" />
            <line x1="231" y1="157" x2="249" y2="167" stroke="#A67442" strokeWidth="5" />
          </g>
          {/* Snake 24 -> 16 */}
          <path
            d="M 55 58 C 115 110, 22 175, 58 245"
            fill="none"
            stroke="#C44B34"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M 55 58 C 115 110, 22 175, 58 245"
            fill="none"
            stroke="#F6D0C6"
            strokeWidth="3.2"
            strokeDasharray="6 12"
            strokeLinecap="round"
          />
          <circle cx="55" cy="58" r="9" fill="#8F2F1E" stroke="#FFFDF8" strokeWidth="1.5" />
          {/* Two pawn markers */}
          <circle cx="255" cy="60" r="14" fill="#D6453A" stroke="#FFFDF8" strokeWidth="3" />
          <circle cx="340" cy="155" r="14" fill="#2B6CB0" stroke="#FFFDF8" strokeWidth="3" />
        </svg>
      </div>
    </div>
  );
}

export function LandingPage({
  initialName,
  connectionStatus,
  mockMode,
  wsUrl,
  onCreateRoom,
  onJoinRoom,
  onEnableMockMode,
}: LandingPageProps) {
  const [name, setName] = useState(initialName);
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [roomCode, setRoomCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const isBusy =
    connectionStatus === 'connecting' || connectionStatus === 'reconnecting';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setFormError('Nama pemain minimal 2 karakter.');
      return;
    }

    if (tab === 'create') {
      setFormError(null);
      onCreateRoom(trimmedName, maxPlayers);
      return;
    }

    const cleanedCode = roomCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (cleanedCode.length !== 6) {
      setFormError('Kode room harus tepat 6 karakter huruf atau angka.');
      return;
    }
    setFormError(null);
    onJoinRoom(trimmedName, cleanedCode);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-12">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
        {/* Kolom Kiri: Identitas Editorial Tabletop + Cuplikan Papan + Aturan Ringkas */}
        <section className="lg:col-span-6 space-y-6">
          <div className="space-y-3">
            <h1 className="font-display text-4xl font-extrabold leading-[1.06] text-[#1F1A15] sm:text-5xl">
              Ular Tangga Multiplayer & Kuis IT
            </h1>
            <p className="max-w-xl text-base font-medium text-[#5A5045] leading-relaxed">
              Balapan 2–5 pemain menuju petak 100 di atas papan acak setiap
              sesi. Naik tangga, hindari ular, dan jawab soal jaringan untuk
              bonus langkah.
            </p>
          </div>

          <MiniBoardSpecimen />

          {/* Daftar aturan tanpa kotak-kotak seragam — garis pemisah editorial tipis */}
          <dl className="divide-y divide-[#DDD1BE] border-y border-[#DDD1BE] text-sm">
            <div className="flex items-start gap-3 py-3">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[#266D4B]" />
              <div>
                <dt className="font-bold text-[#1F1A15]">Papan 100 petak acak</dt>
                <dd className="text-xs text-[#605549] mt-0.5">
                  Tangga menaikkan bidak, ular menurunkan ke ekor, dan petak
                  kuis menguji wawasan IT dalam 20 detik.
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3 py-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#C44B34]" />
              <div>
                <dt className="font-bold text-[#1F1A15]">
                  Dadu 6 dapat giliran ekstra
                </dt>
                <dd className="text-xs text-[#605549] mt-0.5">
                  Setiap giliran berdurasi 10 detik; server otomatis melempar
                  dadu jika waktu habis.
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3 py-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#4B3624]" />
              <div>
                <dt className="font-bold text-[#1F1A15]">
                  Kendali penuh server ULTA/1.0
                </dt>
                <dd className="text-xs text-[#605549] mt-0.5">
                  Kocokan dadu, posisi papan, dan evaluasi jawaban kuis
                  sepenuhnya dijalankan oleh server TCP Python.
                </dd>
              </div>
            </div>
          </dl>
        </section>

        {/* Kolom Kanan: Kartu Meja Masuk Permainan */}
        <section className="studio-panel lg:col-span-6 overflow-hidden rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DDD1BE] bg-[#2A1E15] px-6 py-4 text-[#FAF6EE]">
            <div>
              <h2 className="font-display text-xl font-extrabold text-[#FFFDF8]">
                Mulai sesi permainan
              </h2>
              <p className="text-xs text-[#D4C7B4]">
                {mockMode
                  ? 'Mode Simulasi (Mock) aktif — siap dimainkan langsung'
                  : `Server: ${wsUrl}`}
              </p>
            </div>
            {!mockMode && (
              <button
                type="button"
                onClick={onEnableMockMode}
                className="btn-tactile inline-flex items-center gap-1.5 rounded-lg border border-[#5A4636] bg-[#3B2C20] px-3 py-1.5 text-xs font-bold text-[#F7E3AC] hover:bg-[#4A3728] cursor-pointer"
              >
                <FlaskConical className="h-3.5 w-3.5" />
                <span>Pakai Mock Mode</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Nama Pemain */}
            <div>
              <label
                htmlFor="player-name-input"
                className="mb-1.5 block text-sm font-bold text-[#1F1A15]"
              >
                Nama pemain
              </label>
              <input
                id="player-name-input"
                type="text"
                maxLength={24}
                placeholder="Masukkan namamu, misal Syarif"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (formError) setFormError(null);
                }}
                className="w-full rounded-xl border-[1.5px] border-[#CFC1AB] bg-[#FAF5EB] px-4 py-3 text-base font-bold text-[#1F1A15] placeholder:font-normal placeholder:text-[#96897A] focus:border-[#1F1A15] focus:bg-[#FFFDF8] focus:outline-none transition-colors"
              />
            </div>

            {/* Switch Buat / Gabung */}
            <div
              className="grid grid-cols-2 gap-1.5 rounded-xl border border-[#D5C7B2] bg-[#EFE6D6] p-1"
              role="tablist"
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'create'}
                onClick={() => {
                  setTab('create');
                  setFormError(null);
                }}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-colors cursor-pointer ${
                  tab === 'create'
                    ? 'bg-[#FFFDF8] text-[#1F1A15] shadow-[0_2px_0_0_#D5C7B2]'
                    : 'text-[#605549] hover:text-[#1F1A15]'
                }`}
              >
                <PlusCircle className="h-4 w-4 text-[#C44B34]" />
                <span>Buat Room</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'join'}
                onClick={() => {
                  setTab('join');
                  setFormError(null);
                }}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-colors cursor-pointer ${
                  tab === 'join'
                    ? 'bg-[#FFFDF8] text-[#1F1A15] shadow-[0_2px_0_0_#D5C7B2]'
                    : 'text-[#605549] hover:text-[#1F1A15]'
                }`}
              >
                <KeyRound className="h-4 w-4 text-[#2B6CB0]" />
                <span>Gabung Room</span>
              </button>
            </div>

            {tab === 'create' ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-[#1F1A15]">
                    Kapasitas pemain
                  </span>
                  <span className="font-code text-xs font-bold text-[#605549]">
                    {maxPlayers} orang
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {CAPACITY_OPTIONS.map((count) => {
                    const active = maxPlayers === count;
                    return (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setMaxPlayers(count)}
                        className={`btn-tactile rounded-xl border-[1.5px] py-2.5 font-display text-lg font-extrabold cursor-pointer ${
                          active
                            ? 'border-[#1F1A15] bg-[#1F1A15] text-[#FFFDF8] shadow-[0_3px_0_0_#4A3E33]'
                            : 'border-[#CFC1AB] bg-[#FAF5EB] text-[#1F1A15] hover:border-[#1F1A15]'
                        }`}
                      >
                        {count}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-[#605549]">
                  Kode room 6 karakter otomatis dibuat agar temanmu bisa segera
                  bergabung.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <label
                  htmlFor="room-code-input"
                  className="block text-sm font-bold text-[#1F1A15]"
                >
                  Kode room (6 karakter)
                </label>
                <input
                  id="room-code-input"
                  type="text"
                  maxLength={6}
                  placeholder="5C0315"
                  value={roomCode}
                  onChange={(e) => {
                    const formatted = e.target.value
                      .replace(/[^A-Za-z0-9]/g, '')
                      .toUpperCase()
                      .slice(0, 6);
                    setRoomCode(formatted);
                    if (formError) setFormError(null);
                  }}
                  className="w-full rounded-xl border-[1.5px] border-[#CFC1AB] bg-[#FAF5EB] px-4 py-3 text-center font-code text-2xl font-bold tracking-[0.35em] text-[#1F1A15] placeholder:tracking-[0.25em] placeholder:text-[#C4B7A3] focus:border-[#2B6CB0] focus:bg-[#FFFDF8] focus:outline-none"
                />
                <p className="text-xs text-[#605549]">
                  Huruf otomatis kapital. Minta kode 6 karakter dari Host room.
                </p>
              </div>
            )}

            {formError && (
              <p className="rounded-xl border border-[#E7B5A9] bg-[#FCEBE7] px-3.5 py-2 text-xs font-bold text-[#8F2F1E]">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={isBusy}
              className={`btn-chunky flex w-full items-center justify-center gap-2 rounded-xl border-2 py-3.5 font-display text-base font-extrabold text-[#FFFDF8] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                tab === 'create'
                  ? 'border-[#8A2E1D] bg-[#C44B34] shadow-[0_4px_0_0_#8A2E1D] hover:bg-[#B2412B]'
                  : 'border-[#1B4470] bg-[#2B6CB0] shadow-[0_4px_0_0_#1B4470] hover:bg-[#235993]'
              }`}
            >
              <span>
                {isBusy
                  ? 'Menghubungkan ke server...'
                  : tab === 'create'
                    ? 'Buat Room & Masuk Lobby'
                    : 'Gabung ke Room'}
              </span>
              <ArrowRight className="h-4.5 w-4.5" />
            </button>

            <div className="flex items-center gap-2 pt-1 text-xs text-[#605549]">
              <Brain className="h-3.5 w-3.5 shrink-0 text-[#B7791F]" />
              <span>
                Semua soal kuis IT dievaluasi langsung oleh server tanpa
                membocorkan kunci ke browser.
              </span>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
