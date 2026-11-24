import { LogOut, Users } from 'lucide-react';
import { DiceControlPanel } from '../components/DiceControlPanel';
import { EventLogPanel } from '../components/EventLogPanel';
import { GameBoard } from '../components/GameBoard';
import { AnswerResultBanner } from '../components/QuestionModal';
import type {
  ActiveQuestionState,
  ActiveTurnState,
  ResolvedAnswerState,
} from '../store/gameStore';
import type {
  BoardCell,
  GameLogEntry,
  MoveEvent,
  RoomStateData,
} from '../types/protocol';

interface GameArenaPageProps {
  room: RoomStateData | null;
  board: BoardCell[];
  positions: Record<string, number>;
  currentTurn: ActiveTurnState | null;
  myPlayerId: string | null;
  isMyTurn: boolean;
  activeQuestion: ActiveQuestionState | null;
  lastMove: MoveEvent | null;
  lastAnswerResult: ResolvedAnswerState | null;
  logs: GameLogEntry[];
  onRollDice: () => void;
  onLeaveRoom: () => void;
}

export function GameArenaPage({
  room,
  board,
  positions,
  currentTurn,
  myPlayerId,
  isMyTurn,
  activeQuestion,
  lastMove,
  lastAnswerResult,
  logs,
  onRollDice,
  onLeaveRoom,
}: GameArenaPageProps) {
  const players = room?.players ?? [];

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-5">
      {/* Bar Info Ringkas */}
      <div className="surface-card mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl px-3.5 py-2">
        <div className="flex items-center gap-3 text-xs font-semibold text-[#5A5045]">
          <span className="rounded-md border border-[#E7CB82] bg-[#FDF3D7] px-2 py-0.5 font-code font-bold text-[#7D530B]">
            ROOM {room?.roomCode ?? '------'}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-[#2F7D57]" />
            {players.length} Pemain
          </span>
        </div>

        <button
          type="button"
          onClick={onLeaveRoom}
          className="inline-flex items-center gap-1 rounded-lg border border-[#ECC1B7] bg-[#FCEBE7] px-2.5 py-1 text-xs font-bold text-[#963826] hover:bg-[#F8DDD6] cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Keluar</span>
        </button>
      </div>

      {/* Hierarki Utama: Papan 10x10 Mendominasi (lg:col-span-8), Kontrol Ringkas (lg:col-span-4) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-8 space-y-3">
          <AnswerResultBanner result={lastAnswerResult} players={players} />
          <GameBoard
            board={board}
            players={players}
            positions={positions}
            currentTurnPlayerId={currentTurn?.playerId ?? null}
            myPlayerId={myPlayerId}
            lastMove={lastMove}
          />
        </div>

        <aside className="lg:col-span-4 space-y-3.5">
          <DiceControlPanel
            players={players}
            positions={positions}
            currentTurn={currentTurn}
            myPlayerId={myPlayerId}
            isMyTurn={isMyTurn}
            hasActiveQuestion={activeQuestion !== null}
            lastMove={lastMove}
            onRollDice={onRollDice}
          />

          <EventLogPanel logs={logs} />
        </aside>
      </div>
    </div>
  );
}
