import { X } from 'lucide-react';
import {
  DesktopDiceSection,
  MobileBottomCommandDock,
  PlayerStandingsSection,
} from '../components/DiceControlPanel';
import { EventLogPanel } from '../components/EventLogPanel';
import { GameBoard } from '../components/GameBoard';
import type { StageBanner } from '../hooks/usePresentationQueue';
import type { ActiveTurnState } from '../store/gameStore';
import type {
  BoardCell,
  GameLogEntry,
  MoveEvent,
  RoomStateData,
} from '../types/protocol';

interface GameArenaPageProps {
  room: RoomStateData | null;
  board: BoardCell[];
  displayedPositions: Record<string, number>;
  displayedTurn: ActiveTurnState | null;
  displayedMove: MoveEvent | null;
  displayedDice: number;
  isDiceRolling: boolean;
  hoppingPlayerId: string | null;
  highlightedPathKey: string | null;
  stageBanner: StageBanner | null;
  myPlayerId: string | null;
  canRoll: boolean;
  hasActiveQuestion: boolean;
  isAnimating: boolean;
  logs: GameLogEntry[];
  mobileDrawerOpen: boolean;
  onCloseMobileDrawer: () => void;
  onRollDice: () => void;
}

/**
 * Halaman Arena Tanpa Scroll (100dvh):
 * - Desktop (>= 1024px): 2 kolom sejajar — Papan 10x10 dominan di kiri, Command Dock menempel di kanan
 *   dengan log kejadian yang scroll mandiri di dalam kotaknya.
 * - Mobile (< 1024px): Papan 10x10 utuh di tengah + Sticky Bottom Command Dock untuk lempar dadu
 *   tanpa pernah perlu scroll, plus slide-up drawer untuk daftar pemain & log kejadian.
 */
export function GameArenaPage({
  room,
  board,
  displayedPositions,
  displayedTurn,
  displayedMove,
  displayedDice,
  isDiceRolling,
  hoppingPlayerId,
  highlightedPathKey,
  stageBanner,
  myPlayerId,
  canRoll,
  hasActiveQuestion,
  isAnimating,
  logs,
  mobileDrawerOpen,
  onCloseMobileDrawer,
  onRollDice,
}: GameArenaPageProps) {
  const players = room?.players ?? [];

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      {/* Main Arena Viewport (strictly no page scroll) */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 min-h-0 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_350px] xl:grid-cols-[minmax(0,1fr)_380px] lg:gap-4 px-2 py-1.5 sm:px-4 sm:py-2.5 overflow-hidden">
        {/* Kolom Utama: Papan 10x10 Dominan */}
        <section className="flex flex-1 min-h-0 items-center justify-center overflow-hidden">
          <GameBoard
            board={board}
            players={players}
            positions={displayedPositions}
            currentTurnPlayerId={displayedTurn?.playerId ?? null}
            myPlayerId={myPlayerId}
            hoppingPlayerId={hoppingPlayerId}
            highlightedPathKey={highlightedPathKey}
            stageBanner={stageBanner}
          />
        </section>

        {/* Desktop Command Dock (Kanan — satu panel studio terpadu, log scroll internal) */}
        <aside className="studio-panel hidden lg:flex h-full min-h-0 flex-col overflow-hidden rounded-2xl">
          <DesktopDiceSection
            players={players}
            positions={displayedPositions}
            currentTurn={displayedTurn}
            myPlayerId={myPlayerId}
            canRoll={canRoll}
            isDiceRolling={isDiceRolling}
            displayedDice={displayedDice}
            displayedMove={displayedMove}
            hasActiveQuestion={hasActiveQuestion}
            isAnimating={isAnimating}
            onRollDice={onRollDice}
          />

          <PlayerStandingsSection
            players={players}
            positions={displayedPositions}
            currentTurnPlayerId={displayedTurn?.playerId ?? null}
            myPlayerId={myPlayerId}
          />

          <EventLogPanel logs={logs} embedded />
        </aside>
      </div>

      {/* Mobile Sticky Bottom Command Dock (< 1024px) */}
      <MobileBottomCommandDock
        players={players}
        currentTurn={displayedTurn}
        myPlayerId={myPlayerId}
        canRoll={canRoll}
        isDiceRolling={isDiceRolling}
        displayedDice={displayedDice}
        hasActiveQuestion={hasActiveQuestion}
        isAnimating={isAnimating}
        onRollDice={onRollDice}
      />

      {/* Mobile Slide-up Drawer untuk Posisi Pemain & Log Kejadian */}
      {mobileDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex items-end bg-[#1F1A15]/55"
          role="dialog"
          aria-modal="true"
          aria-label="Pemain dan catatan permainan"
          onClick={onCloseMobileDrawer}
        >
          <div
            className="animate-popup-in flex max-h-[75dvh] w-full flex-col overflow-hidden rounded-t-2xl border-t-2 border-[#352517] bg-[#FFFDF8]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#DDD1BE] px-4 py-3">
              <h2 className="font-display text-base font-extrabold text-[#1F1A15]">
                Pemain & Catatan
              </h2>
              <button
                type="button"
                onClick={onCloseMobileDrawer}
                aria-label="Tutup panel"
                className="rounded-lg p-1 text-[#605549] hover:bg-[#EFE6D6]"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <PlayerStandingsSection
              players={players}
              positions={displayedPositions}
              currentTurnPlayerId={displayedTurn?.playerId ?? null}
              myPlayerId={myPlayerId}
            />
            <div className="flex flex-1 min-h-[180px] flex-col overflow-hidden">
              <EventLogPanel logs={logs} embedded />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
