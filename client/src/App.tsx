import { useCallback, useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { QuestionModal } from './components/QuestionModal';
import { ToastContainer } from './components/ToastContainer';
import { useGameSocket } from './hooks/useGameSocket';
import { GameArenaPage } from './pages/GameArenaPage';
import { GameOverPage } from './pages/GameOverPage';
import { LandingPage } from './pages/LandingPage';
import { LeaderboardPlaceholder } from './pages/LeaderboardPlaceholder';
import { LobbyPage } from './pages/LobbyPage';

type PendingRoomAction =
  | { type: 'create'; maxPlayers: number }
  | { type: 'join'; roomCode: string }
  | null;

export default function App() {
  const game = useGameSocket({ disconnectOnUnmount: true });
  const [activeView, setActiveView] = useState<'game' | 'leaderboard'>('game');
  const [pendingAction, setPendingAction] = useState<PendingRoomAction>(null);

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

  const handleCreateRoomFromLanding = useCallback(
    (playerName: string, maxPlayers: number) => {
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
    game.leaveRoom();
    setActiveView('game');
  }, [game]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        connectionStatus={game.connectionStatus}
        mockMode={game.mockMode}
        activeView={activeView}
        roomCode={game.room?.roomCode}
        onToggleMockMode={game.setMockMode}
        onReconnect={game.reconnect}
        onChangeView={setActiveView}
      />

      <ToastContainer toasts={game.toasts} onDismiss={game.dismissToast} />

      <main className="flex-1">
        {activeView === 'leaderboard' ? (
          <LeaderboardPlaceholder onBackToGame={() => setActiveView('game')} />
        ) : game.phase === 'lobby' && game.room ? (
          <LobbyPage
            room={game.room}
            myPlayerId={game.playerId}
            myPlayer={game.myPlayer}
            isHost={game.isHost}
            canStartGame={game.canStartGame}
            onToggleReady={game.toggleReady}
            onStartGame={game.startGame}
            onLeaveRoom={game.leaveRoom}
          />
        ) : game.phase === 'playing' ? (
          <GameArenaPage
            room={game.room}
            board={game.board}
            positions={game.positions}
            currentTurn={game.currentTurn}
            myPlayerId={game.playerId}
            isMyTurn={game.isMyTurn}
            activeQuestion={game.activeQuestion}
            lastMove={game.lastMove}
            lastAnswerResult={game.lastAnswerResult}
            logs={game.logs}
            onRollDice={game.rollDice}
            onLeaveRoom={game.leaveRoom}
          />
        ) : game.phase === 'gameover' && game.gameOver ? (
          <GameOverPage
            gameOver={game.gameOver}
            room={game.room}
            myPlayerId={game.playerId}
            startedAt={game.startedAt}
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

      {/* Global Quiz Modal (muncul otomatis saat ada QUESTION di fase playing) */}
      {game.phase === 'playing' && (
        <QuestionModal
          question={game.activeQuestion}
          players={game.room?.players ?? []}
          isAnswering={game.isAnsweringQuestion}
          onSubmitAnswer={game.submitAnswer}
        />
      )}
    </div>
  );
}
