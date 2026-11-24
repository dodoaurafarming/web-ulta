import { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Crown,
  LogOut,
  Play,
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
      setCopied(true);
      setTimeout(() => setCopied(false), 2_200);
    }
  };

  const startHint = !isHost
    ? 'Menunggu Host memulai permainan.'
    : room.players.length < 2
      ? 'Minimal 2 pemain bergabung sebelum memulai.'
      : !allReady
        ? 'Semua pemain harus menekan tombol Saya Siap.'
        : 'Semua pemain siap — kamu bisa memulai sekarang.';

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      {/* Satu Tiket Meja Terpadu (Walnut Header + Roster Ivory) */}
      <section className="studio-panel overflow-hidden rounded-2xl">
        {/* Bagian Atas: Kode Room Besar */}
        <div className="flex flex-col items-center justify-between gap-5 border-b-2 border-[#352517] bg-[#2A1E15] px-6 py-6 text-[#FAF6EE] sm:flex-row sm:px-8">
          <div className="text-center sm:text-left">
            <h1 className="font-display text-2xl font-extrabold text-[#FFFDF8] sm:text-3xl">
              Ruang tunggu room
            </h1>
            <p className="mt-1 text-sm text-[#D4C7B4]">
              Bagikan kode room 6 karakter ini ke teman ({room.players.length}/
              {room.maxPlayers} pemain bergabung).
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[#5A4636] bg-[#36281D] px-4 py-3">
            <div className="font-code text-3xl font-bold tracking-[0.25em] text-[#F7E3AC] sm:text-4xl pl-1.5">
              {room.roomCode || '------'}
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="btn-tactile inline-flex items-center gap-1.5 rounded-lg border border-[#D5C7B2] bg-[#FFFDF8] px-3 py-2 text-xs font-bold text-[#1F1A15] hover:bg-[#EFE6D6] cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#266D4B]" />
                  <span className="text-[#1D5439]">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-[#605549]" />
                  <span>Salin</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bagian Tengah: Daftar Pemain */}
        <div className="p-6 sm:p-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-extrabold text-[#1F1A15]">
              Pemain di meja ({readyCount}/{room.players.length} siap)
            </h2>
            <span
              className={`text-xs font-bold ${
                allReady ? 'text-[#1D5439]' : 'text-[#8A580F]'
              }`}
            >
              {allReady ? 'Semua pemain siap' : 'Menunggu kesiapan'}
            </span>
          </div>

          <div className="divide-y divide-[#E5DAC7] rounded-xl border border-[#DDD1BE] bg-[#FAF5EB]">
            {room.players.map((player) => {
              const palette = getPlayerPalette(player.colorIndex);
              const isMe = player.playerId === myPlayerId;
              const isPlayerHost =
                player.isHost || room.hostId === player.playerId;

              return (
                <div
                  key={player.playerId}
                  className={`flex items-center justify-between gap-3 px-4 py-3.5 ${
                    isMe ? 'bg-[#FFFDF8]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#FFFDF8] text-sm font-extrabold text-[#FFFDF8] shadow-sm ${palette.bg}`}
                    >
                      {player.name.slice(0, 1).toUpperCase()}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#FFFDF8] ${
                          player.online ? 'bg-[#266D4B]' : 'bg-[#96897A]'
                        }`}
                      />
                    </span>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-bold text-[#1F1A15]">
                          {player.name}
                          {isMe ? ' (Kamu)' : ''}
                        </span>
                        {isPlayerHost && (
                          <span className="inline-flex items-center gap-1 rounded bg-[#2A1E15] px-1.5 py-0.5 text-[10px] font-bold text-[#F7E3AC]">
                            <Crown className="h-2.5 w-2.5" />
                            Host
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#605549]">
                        {player.online ? (
                          <span className="inline-flex items-center gap-1 text-[#1D5439] font-medium">
                            <Wifi className="h-3 w-3" />
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#8F2F1E] font-medium">
                            <WifiOff className="h-3 w-3" />
                            Offline
                          </span>
                        )}
                        <span>— Bidak {palette.name}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold ${
                      player.ready
                        ? 'border-[#BBDAC8] bg-[#E6F2EB] text-[#1D5439]'
                        : 'border-[#DDD1BE] bg-[#EFE6D6] text-[#605549]'
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

            {Array.from({
              length: Math.max(0, room.maxPlayers - room.players.length),
            }).map((_, idx) => (
              <div
                key={`slot-${idx}`}
                className="px-4 py-3 text-xs font-medium text-[#8E8274]"
              >
                Kursi kosong — menunggu pemain bergabung...
              </div>
            ))}
          </div>

          {/* Bagian Bawah: Aksi Lobby */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-[#605549]">{startHint}</p>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={onLeaveRoom}
                className="btn-tactile inline-flex items-center gap-1.5 rounded-xl border border-[#E7B5A9] bg-[#FCEBE7] px-4 py-2.5 text-sm font-bold text-[#8F2F1E] hover:bg-[#F7DAD3] cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Keluar</span>
              </button>

              <button
                type="button"
                onClick={onToggleReady}
                className={`btn-tactile inline-flex items-center gap-1.5 rounded-xl border-2 px-5 py-2.5 text-sm font-bold text-[#FFFDF8] cursor-pointer ${
                  myPlayer?.ready
                    ? 'border-[#8A580F] bg-[#C0831F] shadow-[0_3px_0_0_#8A580F] hover:bg-[#AD7418]'
                    : 'border-[#1B4F36] bg-[#266D4B] shadow-[0_3px_0_0_#1B4F36] hover:bg-[#1F5C3F]'
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
                  className="btn-chunky inline-flex items-center gap-1.5 rounded-xl border-2 border-[#8A2E1D] bg-[#C44B34] px-5 py-2.5 font-display text-sm font-extrabold text-[#FFFDF8] shadow-[0_3px_0_0_#8A2E1D] hover:bg-[#B2412B] cursor-pointer disabled:cursor-not-allowed disabled:border-[#D5C7B2] disabled:bg-[#EAE1D1] disabled:text-[#8E8274] disabled:shadow-none"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Mulai Game</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
