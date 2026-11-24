import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Brain,
  Clock,
  Dices,
  FlaskConical,
  KeyRound,
  PlusCircle,
  ShieldCheck,
  TrendingUp,
  User,
  Users,
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
      setFormError('Kode room harus tepat 6 karakter huruf/angka.');
      return;
    }
    setFormError(null);
    onJoinRoom(trimmedName, cleanedCode);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-9">
      {/* Masthead Tabletop Editorial */}
      <section className="mb-7 rounded-2xl border-2 border-[#352517] bg-[#241E19] p-6 text-[#FAF6EE] shadow-[0_5px_0_0_#352517] sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-2.5">
            <div className="inline-flex items-center gap-2 rounded-md border border-[#5C4A3B] bg-[#332A22] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#E8C66B]">
              <Dices className="h-3.5 w-3.5" />
              <span>Real-Time Tabletop • Protokol ULTA/1.0</span>
            </div>
            <h1 className="font-display text-3xl font-extrabold leading-tight text-[#FFFDF8] sm:text-4xl lg:text-[42px]">
              Ular Tangga Multiplayer & Kuis IT
            </h1>
            <p className="text-sm font-medium text-[#D6CBB9] leading-relaxed sm:text-base">
              Papan 10×10 acak di setiap sesi untuk 2–5 pemain. Naik tangga,
              hindari ular, dan taklukkan petak kuis jaringan untuk langkah
              bonus.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 shrink-0">
            <div className="rounded-xl border border-[#4A3D32] bg-[#302821] px-3.5 py-2.5 text-center">
              <p className="font-display text-2xl font-extrabold leading-none text-[#F8E7B4]">
                100
              </p>
              <p className="mt-1 text-[11px] font-semibold text-[#C8BCAE]">
                Petak Zig-Zag
              </p>
            </div>
            <div className="rounded-xl border border-[#4A3D32] bg-[#302821] px-3.5 py-2.5 text-center">
              <p className="font-display text-2xl font-extrabold leading-none text-[#84D2A7]">
                2–5
              </p>
              <p className="mt-1 text-[11px] font-semibold text-[#C8BCAE]">
                Pemain / Room
              </p>
            </div>
            <div className="rounded-xl border border-[#4A3D32] bg-[#302821] px-3.5 py-2.5 text-center">
              <p className="font-display text-2xl font-extrabold leading-none text-[#F09A88]">
                10d
              </p>
              <p className="mt-1 text-[11px] font-semibold text-[#C8BCAE]">
                Timer Giliran
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Entry Form Card */}
        <section className="surface-card lg:col-span-7 rounded-2xl p-5 sm:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-[#EAE0D0] pb-4">
            <div>
              <h2 className="font-display text-2xl font-extrabold text-[#1F1B17]">
                Masuk ke Meja Permainan
              </h2>
              <p className="mt-0.5 text-xs font-medium text-[#645A4E]">
                {mockMode
                  ? 'Mode Simulasi Lokal (Mock Mode) aktif — uji penuh tanpa server VPS.'
                  : `WebSocket Bridge: ${wsUrl}`}
              </p>
            </div>
            {!mockMode && (
              <button
                type="button"
                onClick={onEnableMockMode}
                className="btn-tactile inline-flex items-center gap-1.5 rounded-lg border border-[#D9CEBC] bg-[#F3ECE0] px-3 py-1.5 text-xs font-bold text-[#1F1B17] hover:bg-[#EAE0CF] cursor-pointer"
              >
                <FlaskConical className="h-3.5 w-3.5 text-[#7B4B94]" />
                <span>Coba Mock Mode</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nama Pemain */}
            <div>
              <label
                htmlFor="player-name-input"
                className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#5A5045]"
              >
                <User className="h-3.5 w-3.5 text-[#C8523B]" />
                <span>Nama Pemain</span>
              </label>
              <input
                id="player-name-input"
                type="text"
                maxLength={24}
                placeholder="Contoh: Syarif"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (formError) setFormError(null);
                }}
                className="w-full rounded-xl border-[1.5px] border-[#D6C9B5] bg-[#FAF6EE] px-4 py-3 text-base font-bold text-[#1F1B17] placeholder:font-medium placeholder:text-[#9A8E7F] focus:border-[#1F1B17] focus:bg-[#FFFDF8] focus:outline-none transition-colors"
              />
            </div>

            {/* Mode Switch: Buat Room vs Gabung Room */}
            <div
              className="grid grid-cols-2 gap-1.5 rounded-xl border border-[#DFD5C5] bg-[#F3ECE0] p-1"
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
                    ? 'bg-[#FFFDF8] text-[#1F1B17] shadow-[0_2px_0_0_#DDD2C0]'
                    : 'text-[#645A4E] hover:text-[#1F1B17]'
                }`}
              >
                <PlusCircle className="h-4 w-4 text-[#C8523B]" />
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
                    ? 'bg-[#FFFDF8] text-[#1F1B17] shadow-[0_2px_0_0_#DDD2C0]'
                    : 'text-[#645A4E] hover:text-[#1F1B17]'
                }`}
              >
                <KeyRound className="h-4 w-4 text-[#2B6CB0]" />
                <span>Gabung Room</span>
              </button>
            </div>

            {/* Tab Content */}
            {tab === 'create' ? (
              <div className="surface-inset rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#5A5045]">
                    <Users className="h-4 w-4 text-[#2F7D57]" />
                    <span>Kapasitas Pemain</span>
                  </span>
                  <span className="rounded-md border border-[#D9CEBC] bg-[#FFFDF8] px-2.5 py-0.5 font-code text-xs font-bold text-[#1F1B17]">
                    {maxPlayers} Pemain
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
                            ? 'border-[#1F1B17] bg-[#1F1B17] text-[#FFFDF8] shadow-[0_3px_0_0_#4A3F35]'
                            : 'border-[#D6C9B5] bg-[#FFFDF8] text-[#1F1B17] hover:border-[#1F1B17]'
                        }`}
                      >
                        {count}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs font-medium text-[#645A4E]">
                  Kode room acak 6 karakter dibuat otomatis oleh server untuk
                  dibagikan ke pemain lain.
                </p>
              </div>
            ) : (
              <div className="surface-inset rounded-xl p-4 space-y-2.5">
                <label
                  htmlFor="room-code-input"
                  className="block text-xs font-bold uppercase tracking-wider text-[#5A5045]"
                >
                  Kode Room (6 Karakter)
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
                  className="w-full rounded-xl border-[1.5px] border-[#D6C9B5] bg-[#FFFDF8] px-4 py-3 text-center font-code text-2xl font-bold tracking-[0.35em] text-[#1F1B17] placeholder:tracking-[0.25em] placeholder:text-[#C5B9A6] focus:border-[#2B6CB0] focus:outline-none"
                />
                <p className="text-xs font-medium text-[#645A4E]">
                  Otomatis kapital. Masukkan 6 karakter kode room dari Host.
                </p>
              </div>
            )}

            {formError && (
              <p className="rounded-xl border border-[#ECC1B7] bg-[#FCEBE7] px-3.5 py-2 text-xs font-bold text-[#963826]">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={isBusy}
              className={`btn-tactile flex w-full items-center justify-center gap-2 rounded-xl border-[1.5px] py-3.5 text-sm font-bold text-[#FFFDF8] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                tab === 'create'
                  ? 'border-[#963826] bg-[#C8523B] shadow-[0_3px_0_0_#963826] hover:bg-[#B54731]'
                  : 'border-[#1E4B7A] bg-[#2B6CB0] shadow-[0_3px_0_0_#1E4B7A] hover:bg-[#235993]'
              }`}
            >
              <span>
                {isBusy
                  ? 'Menghubungkan ke Server...'
                  : tab === 'create'
                    ? 'Buat Room & Masuk Lobby'
                    : 'Gabung ke Room'}
              </span>
              <ArrowRight className="h-4.5 w-4.5" />
            </button>
          </form>
        </section>

        {/* Rules Card */}
        <aside className="surface-card lg:col-span-5 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[#EAE0D0] pb-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#BBDAC8] bg-[#E6F2EB] text-[#2F7D57]">
              <Dices className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-extrabold text-[#1F1B17]">
                Panduan Singkat
              </h2>
              <p className="text-xs font-medium text-[#645A4E]">
                Aturan resmi protokol ULTA/1.0
              </p>
            </div>
          </div>

          <ul className="space-y-2.5 text-xs sm:text-[13px]">
            <li className="flex items-start gap-3 rounded-xl border border-[#C6DFD0] bg-[#EBF5EF] p-3">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[#2F7D57]" />
              <span className="text-[#3C352E] leading-relaxed">
                <strong className="text-[#1F1B17]">Tangga & Ular</strong> diacak
                setiap sesi. Tangga melesat naik ke ujung atas, ular menurunkan
                pion ke ekornya.
              </span>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-[#E7CB82] bg-[#FDF4DC] p-3">
              <Brain className="mt-0.5 h-4 w-4 shrink-0 text-[#B7791F]" />
              <span className="text-[#3C352E] leading-relaxed">
                <strong className="text-[#1F1B17]">Petak Kuis IT</strong>: jawab
                pilihan ganda A–D dalam 20 detik. Benar maju bonus dadu, salah
                atau waktu habis mundur.
              </span>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-[#ECC1B7] bg-[#FCECE8] p-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#C8523B]" />
              <span className="text-[#3C352E] leading-relaxed">
                <strong className="text-[#1F1B17]">Dadu 6 = Extra Turn</strong>.
                Batas melempar dadu 10 detik sebelum server melempar otomatis.
              </span>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-[#E2D7C4] bg-[#F4EDE0] p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#4B3624]" />
              <span className="text-[#3C352E] leading-relaxed">
                <strong className="text-[#1F1B17]">Authoritative Server</strong>
                : seluruh dadu, posisi, timer, dan evaluasi kunci jawaban
                sepenuhnya dikendalikan server.
              </span>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
