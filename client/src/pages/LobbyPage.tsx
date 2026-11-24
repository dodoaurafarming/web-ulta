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
      setCopied(true);
      setTimeout(() => setCopied(false), 2_200);
    }
  };

  const startHint = !isHost
    ? 'Menunggu Host memulai permainan...'
    : room.players.length < 2
      ? 'Minimal 2 pemain bergabung untuk memulai.'
      : !allReady
        ? 'Semua pemain harus berstatus SIAP.'
        : 'Semua pemain siap — klik Mulai Game.';

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-9 space-y-6">
      {/* Room Ticket Header */}
      <section className="rounded-2xl border-2 border-[#352517] bg-[#241E19] p-6 text-[#FAF6EE] shadow-[0_5px_0_0_#352517] sm:p-7">
        <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
          <div className="text-center sm:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[#5C4A3B] bg-[#332A22] px-2.5 py-1 text-xs font-bold text-[#E8C66B]">
              <Users className="h-3.5 w-3.5" />
              <span>
                Ruang Tunggu • {room.players.length}/{room.maxPlayers} Pemain
              </span>
            </span>
            <h1 className="mt-2.5 font-display text-2xl font-extrabold text-[#FFFDF8] sm:text-3xl">
              Bagikan Kode Room
            </h1>
            <p className="mt-1 text-xs font-medium text-[#C8BCAE] sm:text-sm">
              Ajak 2–5 pemain untuk bergabung sebelum Host menekan Mulai Game.
            </p>
          </div>

          <div className="flex flex-col items-center gap-2.5 rounded-xl border border-[#5C4A3B] bg-[#302821] px-5 py-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#C8BCAE]">
              Kode Room
            </span>
            <div className="font-code text-3xl font-bold tracking-[0.28em] text-[#F8E7B4] sm:text-4xl pl-2">
              {room.roomCode || '------'}
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="btn-tactile inline-flex items-center gap-1.5 rounded-lg border border-[#D9CEBC] bg-[#FFFDF8] px-3.5 py-1.5 text-xs font-bold text-[#1F1B17] shadow-[0_2px_0_0_#C8BCAE] hover:bg-[#F3ECE0] cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#2F7D57]" />
                  <span className="text-[#1F5C40]">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-[#645A4E]" />
                  <span>Salin Kode</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Player Roster Card */}
      <section className="surface-card rounded-2xl p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#EAE0D0] pb-3.5">
          <div>
            <h2 className="font-display text-xl font-extrabold text-[#1F1B17]">
              Daftar Pemain ({room.players.length}/{room.maxPlayers})
            </h2>
            <p className="text-xs font-medium text-[#645A4E]">
              {readyCount} dari {room.players.length} pemain sudah siap
            </p>
          </div>
          <span
            className={`rounded-md border px-2.5 py-1 text-xs font-bold ${
              allReady
                ? 'border-[#BBDAC8] bg-[#E6F2EB] text-[#1F5C40]'
                : 'border-[#E7CB82] bg-[#FDF3D7] text-[#7D530B]'
            }`}
          >
            {allReady ? 'Semua Siap' : 'Menunggu Kesiapan'}
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
                className={`flex items-center justify-between gap-3 rounded-xl border-[1.5px] p-3.5 ${
                  isMe
                    ? 'border-[#1F1B17] bg-[#FAF6EE]'
                    : 'border-[#E2D7C4] bg-[#FFFDF8]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#FFFDF8] text-[#FFFDF8] font-display text-base font-extrabold shadow-[0_2px_0_0_rgba(31,27,23,0.35)] ${palette.bg}`}
                  >
                    {player.name.slice(0, 1).toUpperCase()}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#FFFDF8] ${
                        player.online ? 'bg-[#2F7D57]' : 'bg-[#9A8E7F]'
                      }`}
                      title={player.online ? 'Online' : 'Offline'}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-bold text-[#1F1B17]">
                        {player.name}
                      </span>
                      {isMe && (
                        <span className="rounded bg-[#F8E7B4] px-1.5 py-0.5 text-[10px] font-bold text-[#7D530B]">
                          Anda
                        </span>
                      )}
                      {isPlayerHost && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-[#241E19] px-1.5 py-0.5 text-[10px] font-bold text-[#F8E7B4]">
                          <Crown className="h-2.5 w-2.5" />
                          Host
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-[#645A4E]">
                      {player.online ? (
                        <>
                          <Wifi className="h-3 w-3 text-[#2F7D57]" />
                          <span className="text-[#1F5C40]">Online</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="h-3 w-3 text-[#C8523B]" />
                          <span className="text-[#963826]">Offline</span>
                        </>
                      )}
                      <span>• Pion {palette.name}</span>
                    </div>
                  </div>
                </div>

                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold ${
                    player.ready
                      ? 'border-[#BBDAC8] bg-[#E6F2EB] text-[#1F5C40]'
                      : 'border-[#DFD5C5] bg-[#F3ECE0] text-[#645A4E]'
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
              className="flex items-center justify-center rounded-xl border-[1.5px] border-dashed border-[#D9CEBC] bg-[#FAF6EE]/60 p-4 text-xs font-semibold text-[#8A7F72]"
            >
              Kursi kosong — menunggu pemain...
            </div>
          ))}
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex flex-col gap-3 border-t border-[#EAE0D0] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-[#645A4E]">{startHint}</p>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onLeaveRoom}
              className="btn-tactile inline-flex items-center gap-1.5 rounded-xl border border-[#ECC1B7] bg-[#FCEBE7] px-4 py-2.5 text-sm font-bold text-[#963826] hover:bg-[#F8DDD6] cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Keluar Room</span>
            </button>

            <button
              type="button"
              onClick={onToggleReady}
              className={`btn-tactile inline-flex items-center gap-1.5 rounded-xl border-[1.5px] px-5 py-2.5 text-sm font-bold text-[#FFFDF8] cursor-pointer ${
                myPlayer?.ready
                  ? 'border-[#8C5810] bg-[#C4881A] shadow-[0_3px_0_0_#8C5810] hover:bg-[#B07914]'
                  : 'border-[#1F5C40] bg-[#2F7D57] shadow-[0_3px_0_0_#1F5C40] hover:bg-[#266948]'
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
                className="btn-tactile inline-flex items-center gap-1.5 rounded-xl border-[1.5px] border-[#963826] bg-[#C8523B] px-5 py-2.5 text-sm font-bold text-[#FFFDF8] shadow-[0_3px_0_0_#963826] hover:bg-[#B54731] cursor-pointer disabled:cursor-not-allowed disabled:border-[#D9CEBC] disabled:bg-[#EBE3D5] disabled:text-[#8A7F72] disabled:shadow-none"
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
