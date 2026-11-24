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
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
      {/* Compact Match Info Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-white/85 px-4 py-2.5 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
          <span className="rounded-lg bg-amber-100 px-2.5 py-1 font-code text-amber-900">
            ROOM {room?.roomCode ?? '------'}
          </span>
          <span className="inline-flex items-center gap-1 text-slate-600">
            <Users className="h-3.5 w-3.5 text-indigo-500" />
            {players.length} Pemain
          </span>
        </div>

        <button
          type="button"
          onClick={onLeaveRoom}
          className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-extrabold text-rose-700 hover:bg-rose-100 cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Keluar</span>
        </button>
      </div>

      {/* Main Arena Layout: Board (left/top) + Controls & Logs (right/bottom) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
        {/* Board Column */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3">
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

        {/* Control + Event Log Column */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
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
        </div>
      </div>
    </div>
  );
}
