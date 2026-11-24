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
  Sparkles,
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
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-500 p-6 text-white shadow-xl shadow-orange-500/20 sm:p-8 mb-7">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/3 h-40 w-40 rounded-full bg-yellow-200/25 blur-2xl" />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-yellow-200" />
              <span>Real-Time Multiplayer • Protokol ULTA/1.0</span>
            </div>
            <h1 className="font-display text-3xl font-bold leading-tight drop-shadow-sm sm:text-4xl lg:text-5xl">
              Ular Tangga + Kuis IT Real-Time!
            </h1>
            <p className="text-sm font-medium text-amber-50 sm:text-base">
              Balapan menuju petak 100 bersama 2–5 pemain. Naik tangga, hindari
              ular, dan taklukkan petak Kuis IT untuk bonus langkah ekstra!
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <div className="rounded-2xl bg-white/20 px-4 py-2.5 text-center backdrop-blur-sm">
              <p className="font-display text-2xl font-bold leading-none">100</p>
              <p className="mt-1 text-[11px] font-semibold text-amber-50">
                Petak Acak
              </p>
            </div>
            <div className="rounded-2xl bg-white/20 px-4 py-2.5 text-center backdrop-blur-sm">
              <p className="font-display text-2xl font-bold leading-none">2–5</p>
              <p className="mt-1 text-[11px] font-semibold text-amber-50">
                Pemain / Room
              </p>
            </div>
            <div className="rounded-2xl bg-white/20 px-4 py-2.5 text-center backdrop-blur-sm">
              <p className="font-display text-2xl font-bold leading-none">10</p>
              <p className="mt-1 text-[11px] font-semibold text-amber-50">
                Petak Kuis IT
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Entry Form Card */}
        <section className="lg:col-span-7 rounded-3xl border-2 border-amber-200 bg-white/95 p-5 shadow-xl shadow-amber-900/5 sm:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Mulai Bermain
              </h2>
              <p className="text-xs font-medium text-slate-500">
                {mockMode
                  ? 'Mode Simulasi Lokal (Mock Mode) aktif — langsung main dengan bot!'
                  : `Server WebSocket: ${wsUrl}`}
              </p>
            </div>
            {!mockMode && (
              <button
                type="button"
                onClick={onEnableMockMode}
                className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100 cursor-pointer"
              >
                <FlaskConical className="h-3.5 w-3.5" />
                <span>Coba Mock Mode</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nama Pemain */}
            <div>
              <label
                htmlFor="player-name-input"
                className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-600"
              >
                <User className="h-3.5 w-3.5 text-orange-500" />
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
                className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/70 px-4 py-3 text-base font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-200/60 transition-all"
              />
            </div>

            {/* Mode Switch: Buat Room vs Gabung Room */}
            <div
              className="grid grid-cols-2 gap-2 rounded-2xl bg-amber-100/70 p-1.5"
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
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-extrabold transition-all cursor-pointer ${
                  tab === 'create'
                    ? 'bg-white text-orange-600 shadow-md shadow-orange-500/10'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PlusCircle className="h-4 w-4" />
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
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-extrabold transition-all cursor-pointer ${
                  tab === 'join'
                    ? 'bg-white text-sky-600 shadow-md shadow-sky-500/10'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <KeyRound className="h-4 w-4" />
                <span>Gabung Room</span>
              </button>
            </div>

            {/* Tab Content */}
            {tab === 'create' ? (
              <div className="rounded-2xl border-2 border-orange-100 bg-orange-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-orange-900">
                    <Users className="h-4 w-4 text-orange-500" />
                    <span>Kapasitas Pemain</span>
                  </span>
                  <span className="rounded-full bg-orange-200/80 px-2.5 py-0.5 text-xs font-extrabold text-orange-900">
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
                        className={`btn-tactile rounded-xl border-2 py-2.5 font-display text-lg font-bold transition-all cursor-pointer ${
                          active
                            ? 'border-orange-500 bg-orange-500 text-white shadow-[0_3px_0_0_#c2410c]'
                            : 'border-orange-200 bg-white text-slate-700 hover:border-orange-400'
                        }`}
                      >
                        {count}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs font-medium text-slate-600">
                  Server akan menghasilkan kode room acak 6 karakter yang bisa
                  Anda bagikan ke teman.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-sky-100 bg-sky-50/60 p-4 space-y-2.5">
                <label
                  htmlFor="room-code-input"
                  className="block text-xs font-extrabold uppercase tracking-wider text-sky-900"
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
                  className="w-full rounded-2xl border-2 border-sky-200 bg-white px-4 py-3 text-center font-code text-2xl font-bold tracking-[0.35em] text-sky-950 placeholder:tracking-[0.25em] placeholder:text-slate-300 focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-200/70"
                />
                <p className="text-xs font-medium text-slate-600">
                  Huruf otomatis diubah ke kapital. Minta kode 6 karakter dari
                  Host room.
                </p>
              </div>
            )}

            {formError && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={isBusy}
              className={`btn-tactile flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-extrabold text-white shadow-lg cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                tab === 'create'
                  ? 'bg-gradient-to-r from-orange-500 to-rose-500 shadow-[0_4px_0_0_#be123c] hover:from-orange-600 hover:to-rose-600'
                  : 'bg-gradient-to-r from-sky-500 to-indigo-600 shadow-[0_4px_0_0_#3730a3] hover:from-sky-600 hover:to-indigo-700'
              }`}
            >
              <span>
                {isBusy
                  ? 'Menghubungkan ke Server...'
                  : tab === 'create'
                    ? 'Buat Room & Masuk Lobby'
                    : 'Gabung ke Room'}
              </span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </form>
        </section>

        {/* Rules Card */}
        <aside className="lg:col-span-5 rounded-3xl border-2 border-sky-200 bg-white/95 p-5 shadow-xl shadow-sky-900/5 sm:p-7 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
              <Dices className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">
                Aturan Main ULTA/1.0
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Papan acak setiap sesi & dikendalikan server
              </p>
            </div>
          </div>

          <ul className="space-y-3 text-xs sm:text-sm">
            <li className="flex items-start gap-3 rounded-2xl bg-emerald-50/80 p-3 border border-emerald-100">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span className="text-slate-700 leading-relaxed">
                <strong className="text-slate-900">8 Tangga & 8 Ular</strong>{' '}
                diacak setiap permainan. Tangga melesat naik, ular menurunkan
                pion ke ekornya.
              </span>
            </li>
            <li className="flex items-start gap-3 rounded-2xl bg-amber-50/80 p-3 border border-amber-100">
              <Brain className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span className="text-slate-700 leading-relaxed">
                <strong className="text-slate-900">10 Petak Kuis IT</strong>:
                jawab pilihan ganda A–D dalam 20 detik! Benar maju bonus dadu,
                salah/timeout mundur.
              </span>
            </li>
            <li className="flex items-start gap-3 rounded-2xl bg-indigo-50/80 p-3 border border-indigo-100">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
              <span className="text-slate-700 leading-relaxed">
                <strong className="text-slate-900">Dadu 6 = Extra Turn!</strong>{' '}
                Batas lempar dadu 10 detik (otomatis dilempar server jika
                habis).
              </span>
            </li>
            <li className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3 border border-slate-200/80">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" />
              <span className="text-slate-700 leading-relaxed">
                <strong className="text-slate-900">Authoritative Server</strong>
                : seluruh dadu, posisi, timer, dan evaluasi kunci jawaban
                sepenuhnya dihitung oleh server TCP Python.
              </span>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
