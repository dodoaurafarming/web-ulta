import { useCallback, useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { QuestionModal } from './components/QuestionModal';
import { ToastContainer } from './components/ToastContainer';
import { useGameSocket } from './hooks/useGameSocket';
import { usePresentationQueue } from './hooks/usePresentationQueue';
import { GameArenaPage } from './pages/GameArenaPage';
import { GameOverPage } from './pages/GameOverPage';
import { LandingPage } from './pages/LandingPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { LobbyPage } from './pages/LobbyPage';
import { audioManager } from './services/audioManager';

type PendingRoomAction =
  | { type: 'create'; maxPlayers: number }
  | { type: 'join'; roomCode: string }
  | null;

export default function App() {
  const game = useGameSocket({ disconnectOnUnmount: true });
  const [activeView, setActiveView] = useState<'game' | 'leaderboard'>('game');
  const [pendingAction, setPendingAction] = useState<PendingRoomAction>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const presentation = usePresentationQueue({
    phase: game.phase,
    presentationEvents: game.presentationEvents,
    players: game.room?.players ?? [],
    myPlayerId: game.playerId,
    authoritativePositions: game.positions,
  });

  // Jalankan aksi Buat/Gabung Room otomatis tepat setelah WELCOME diterima
  useEffect(() => {
    if (!pendingAction) return;
    if (game.connectionStatus !== 'connected' || !game.playerId) return;

    if (pendingAction.type === 'create') {
      game.createRoom(pendingAction.maxPlayers);
    } else {
      game.joinRoom(pendingAction.roomCode);
    }
    setPendingAction(null);
  }, [
    pendingAction,
    game.connectionStatus,
    game.playerId,
    game.createRoom,
    game.joinRoom,
  ]);

  // Tutup mobile drawer jika keluar dari Arena
  useEffect(() => {
    if (game.phase !== 'playing') {
      setMobileDrawerOpen(false);
    }
  }, [game.phase]);

  const handleCreateRoomFromLanding = useCallback(
    (playerName: string, maxPlayers: number) => {
      audioManager.playUiClick();
      setActiveView('game');
      if (
        game.connectionStatus === 'connected' &&
        game.playerId &&
        game.playerName === playerName
      ) {
        game.createRoom(maxPlayers);
        return;
      }
      setPendingAction({ type: 'create', maxPlayers });
      game.connect(playerName);
    },
    [game],
  );

  const handleJoinRoomFromLanding = useCallback(
    (playerName: string, roomCode: string) => {
      audioManager.playUiClick();
      setActiveView('game');
      if (
        game.connectionStatus === 'connected' &&
        game.playerId &&
        game.playerName === playerName
      ) {
        game.joinRoom(roomCode);
        return;
      }
      setPendingAction({ type: 'join', roomCode });
      game.connect(playerName);
    },
    [game],
  );

  const handleReturnHome = useCallback(() => {
    audioManager.playUiClick();
    game.leaveRoom();
    setActiveView('game');
  }, [game]);

  const handleToggleReady = useCallback(() => {
    audioManager.playUiClick();
    game.toggleReady();
  }, [game]);

  const handleStartGame = useCallback(() => {
    audioManager.playUiClick();
    game.startGame();
  }, [game]);

  const handleRollDice = useCallback(() => {
    audioManager.playUiClick();
    game.rollDice();
  }, [game]);

  const handleLeaveRoom = useCallback(() => {
    audioManager.playUiClick();
    game.leaveRoom();
  }, [game]);

  // Tetap di Arena sampai animasi langkah kemenangan selesai diputar oleh Presentation Queue
  const showGameOver =
    activeView === 'game' &&
    game.phase === 'gameover' &&
    Boolean(presentation.presentedGameOver ?? game.gameOver) &&
    Boolean(presentation.presentedGameOver);

  const isArenaViewport =
    activeView === 'game' &&
    (game.phase === 'playing' || (game.phase === 'gameover' && !showGameOver));

  // BGM hangat selalu siap & langsung berputar halus sejak interaksi klik pertama
  // pengguna (Landing, Lobby, Arena, Leaderboard), hanya diredupkan saat kuis/fanfare.
  useEffect(() => {
    audioManager.setBgmActive(true);
    return () => {
      audioManager.setBgmActive(false);
    };
  }, []);

  useEffect(() => {
    if (showGameOver) {
      audioManager.setDucked(true);
      const id = window.setTimeout(() => {
        audioManager.setDucked(false);
      }, 2200);
      return () => {
        window.clearTimeout(id);
        audioManager.setDucked(false);
      };
    }
    return undefined;
  }, [showGameOver]);

  const canRoll = Boolean(
    game.phase === 'playing' &&
      game.isMyTurn &&
      !presentation.isAnimating &&
      !presentation.displayedQuestion &&
      !presentation.displayedAnswerResult &&
      presentation.displayedTurn?.playerId === game.playerId,
  );

  return (
    <div
      className={
        isArenaViewport
          ? 'h-dvh overflow-hidden flex flex-col'
          : 'min-h-dvh flex flex-col'
      }
    >
      <Navbar
        connectionStatus={game.connectionStatus}
        mockMode={game.mockMode}
        activeView={activeView}
        compactArena={isArenaViewport}
        roomCode={game.room?.roomCode}
        onToggleMockMode={game.setMockMode}
        onReconnect={game.reconnect}
        onChangeView={setActiveView}
        onLeaveRoom={isArenaViewport ? handleLeaveRoom : undefined}
        onToggleMobileDrawer={
          isArenaViewport
            ? () => setMobileDrawerOpen((prev) => !prev)
            : undefined
        }
        logCount={game.logs.length}
      />

      <ToastContainer toasts={game.toasts} onDismiss={game.dismissToast} />

      <main
        className={
          isArenaViewport
            ? 'flex flex-1 min-h-0 flex-col overflow-hidden'
            : 'flex-1'
        }
      >
        {activeView === 'leaderboard' ? (
          <LeaderboardPage
            mockMode={game.mockMode}
            onBackToGame={() => setActiveView('game')}
          />
        ) : game.phase === 'lobby' && game.room ? (
          <LobbyPage
            room={game.room}
            myPlayerId={game.playerId}
            myPlayer={game.myPlayer}
            isHost={game.isHost}
            canStartGame={game.canStartGame}
            mockMode={game.mockMode}
            onToggleReady={handleToggleReady}
            onStartGame={handleStartGame}
            onLeaveRoom={handleLeaveRoom}
          />
        ) : isArenaViewport ? (
          <GameArenaPage
            room={game.room}
            board={game.board}
            displayedPositions={presentation.displayedPositions}
            displayedTurn={presentation.displayedTurn}
            displayedMove={presentation.displayedMove}
            displayedDice={presentation.displayedDice}
            isDiceRolling={presentation.isDiceRolling}
            hoppingPlayerId={presentation.hoppingPlayerId}
            highlightedPathKey={presentation.highlightedPathKey}
            stageBanner={presentation.stageBanner}
            myPlayerId={game.playerId}
            canRoll={canRoll}
            hasActiveQuestion={
              presentation.displayedQuestion !== null ||
              presentation.displayedAnswerResult !== null
            }
            isAnimating={presentation.isAnimating}
            logs={game.logs}
            mobileDrawerOpen={mobileDrawerOpen}
            onCloseMobileDrawer={() => setMobileDrawerOpen(false)}
            onRollDice={handleRollDice}
          />
        ) : showGameOver && presentation.presentedGameOver ? (
          <GameOverPage
            gameOver={presentation.presentedGameOver}
            room={game.room}
            myPlayerId={game.playerId}
            boardSeed={game.boardSeed}
            startedAt={game.startedAt}
            mockMode={game.mockMode}
            quizStatsByPlayer={game.quizStatsByPlayer}
            onReturnHome={handleReturnHome}
            onOpenLeaderboard={() => setActiveView('leaderboard')}
          />
        ) : (
          <LandingPage
            initialName={game.playerName}
            connectionStatus={game.connectionStatus}
            mockMode={game.mockMode}
            wsUrl={game.wsUrl}
            onCreateRoom={handleCreateRoomFromLanding}
            onJoinRoom={handleJoinRoomFromLanding}
            onEnableMockMode={() => game.setMockMode(true)}
          />
        )}
      </main>

      {/* Modal Kuis IT + Pop-up Hasil Jawaban (dikelola oleh Presentation Queue) */}
      {isArenaViewport && (
        <QuestionModal
          question={presentation.displayedQuestion}
          answerResult={presentation.displayedAnswerResult}
          players={game.room?.players ?? []}
          myPlayerId={game.playerId}
          onSubmitAnswer={game.submitAnswer}
          onContinueResult={presentation.continueAnswerResult}
        />
      )}
    </div>
  );
}
