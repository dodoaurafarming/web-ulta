import { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Crown,
  LogOut,
  Play,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { RoomPlayer, RoomStateData } from '../types/protocol';
import { getPlayerPalette } from '../utils/boardGeometry';

interface LobbyPageProps {
  room: RoomStateData;
  myPlayerId: string | null;
  myPlayer: RoomPlayer | null;
  isHost: boolean;
  canStartGame: boolean;
  onToggleReady: () => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export function LobbyPage({
  room,
  myPlayerId,
  myPlayer,
  isHost,
  canStartGame,
  onToggleReady,
  onStartGame,
  onLeaveRoom,
}: LobbyPageProps) {
  const [copied, setCopied] = useState(false);

  const readyCount = room.players.filter((p) => p.ready).length;
  const allReady =
    room.players.length >= 2 && readyCount === room.players.length;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_200);
    } catch {
      // Fallback sederhana jika clipboard API diblokir
      setCopied(true);
      setTimeout(() => setCopied(false), 2_200);
    }
  };

  const startHint = !isHost
    ? 'Menunggu Host memulai permainan...'
    : room.players.length < 2
      ? 'Minimal 2 pemain bergabung untuk memulai.'
      : !allReady
        ? 'Semua pemain harus menekan tombol Saya Siap.'
        : 'Semua pemain siap! Klik Mulai Game.';

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-9 space-y-6">
      {/* Room Code Hero Card */}
      <section className="relative overflow-hidden rounded-3xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-xl shadow-indigo-500/20 sm:p-8">
        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/15 blur-2xl" />

        <div className="relative flex flex-col items-center justify-between gap-5 sm:flex-row">
          <div className="text-center sm:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
              <Users className="h-3.5 w-3.5" />
              <span>
                Ruang Tunggu • {room.players.length}/{room.maxPlayers} Pemain
              </span>
            </span>
            <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
              Bagikan Kode Room
            </h1>
            <p className="mt-1 text-xs font-medium text-indigo-100 sm:text-sm">
              Ajak 2–5 pemain untuk bergabung ke room ini sebelum Host memulai.
            </p>
          </div>

          <div className="flex flex-col items-center gap-2.5 rounded-2xl bg-white/15 p-4 backdrop-blur-md border border-white/25">
            <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-100">
              Kode Room
            </span>
            <div className="font-code text-4xl font-bold tracking-[0.28em] text-white drop-shadow sm:text-5xl pl-2">
              {room.roomCode || '------'}
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="btn-tactile inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-extrabold text-indigo-700 shadow-md hover:bg-amber-50 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-700">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Salin Kode</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Player Roster */}
      <section className="rounded-3xl border-2 border-amber-200 bg-white/95 p-5 shadow-xl shadow-amber-900/5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900">
              Daftar Pemain ({room.players.length}/{room.maxPlayers})
            </h2>
            <p className="text-xs font-medium text-slate-500">
              {readyCount} dari {room.players.length} pemain sudah siap
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-extrabold ${
              allReady
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {allReady ? 'Semua Siap!' : 'Menunggu Kesiapan'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {room.players.map((player) => {
            const palette = getPlayerPalette(player.colorIndex);
            const isMe = player.playerId === myPlayerId;
            const isPlayerHost =
              player.isHost || room.hostId === player.playerId;

            return (
              <div
                key={player.playerId}
                className={`flex items-center justify-between gap-3 rounded-2xl border-2 p-3.5 transition-all ${
                  isMe
                    ? 'border-amber-400 bg-amber-50/70 shadow-sm'
                    : 'border-slate-200/80 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Pawn Token Avatar */}
                  <div
                    className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 text-white font-display text-lg font-bold shadow-md ${palette.bg} ${palette.border}`}
                  >
                    {player.name.slice(0, 1).toUpperCase()}
                    <span
                      className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white ${
                        player.online ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                      title={player.online ? 'Online' : 'Offline'}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-extrabold text-slate-900">
                        {player.name}
                      </span>
                      {isMe && (
                        <span className="rounded-md bg-amber-200 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-900">
                          Anda
                        </span>
                      )}
                      {isPlayerHost && (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-extrabold text-violet-800">
                          <Crown className="h-3 w-3" />
                          Host
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                      {player.online ? (
                        <>
                          <Wifi className="h-3 w-3 text-emerald-600" />
                          <span className="text-emerald-700">Online</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="h-3 w-3 text-rose-500" />
                          <span className="text-rose-600">Offline</span>
                        </>
                      )}
                      <span>• Pion {palette.name}</span>
                    </div>
                  </div>
                </div>

                {/* Ready Status Badge */}
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-extrabold ${
                    player.ready
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-200/80 text-slate-600 border border-slate-300/60'
                  }`}
                >
                  {player.ready ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>SIAP</span>
                    </>
                  ) : (
                    <>
                      <Clock3 className="h-3.5 w-3.5" />
                      <span>BELUM SIAP</span>
                    </>
                  )}
                </span>
              </div>
            );
          })}

          {/* Empty slots */}
          {Array.from({
            length: Math.max(0, room.maxPlayers - room.players.length),
          }).map((_, idx) => (
            <div
              key={`slot-${idx}`}
              className="flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/40 p-4 text-xs font-semibold text-slate-400"
            >
              Menunggu pemain bergabung...
            </div>
          ))}
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-slate-600">{startHint}</p>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onLeaveRoom}
              className="btn-tactile inline-flex items-center gap-1.5 rounded-2xl border-2 border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-extrabold text-rose-700 hover:bg-rose-100 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Keluar Room</span>
            </button>

            <button
              type="button"
              onClick={onToggleReady}
              className={`btn-tactile inline-flex items-center gap-1.5 rounded-2xl px-5 py-2.5 text-sm font-extrabold text-white shadow-md cursor-pointer ${
                myPlayer?.ready
                  ? 'bg-amber-500 shadow-[0_3px_0_0_#b45309] hover:bg-amber-600'
                  : 'bg-emerald-500 shadow-[0_3px_0_0_#047857] hover:bg-emerald-600'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{myPlayer?.ready ? 'Batal Siap' : 'Saya Siap'}</span>
            </button>

            {isHost && (
              <button
                type="button"
                onClick={onStartGame}
                disabled={!canStartGame}
                className="btn-tactile inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-extrabold text-white shadow-[0_3px_0_0_#3730a3] hover:from-indigo-700 hover:to-violet-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Mulai Game</span>
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
