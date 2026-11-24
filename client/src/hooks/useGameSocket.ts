import { useCallback, useEffect, useMemo } from 'react';
import { MockGameTransport } from '../services/mockTransport';
import { parseServerEvent } from '../services/protocolParser';
import { loadStoredSession } from '../services/sessionStorage';
import type { GameTransport } from '../services/transport';
import { WebSocketTransport } from '../services/wsTransport';
import { useGameStore } from '../store/gameStore';
import type { ClientMessagePayload, QuizChoice } from '../types/protocol';

const HEARTBEAT_INTERVAL_MS = 7_000;

let activeTransport: GameTransport | null = null;

function createTransport(mockMode: boolean): GameTransport {
  return mockMode ? new MockGameTransport() : new WebSocketTransport();
}

export function disconnectActiveTransport(): void {
  if (activeTransport) {
    activeTransport.disconnect();
    activeTransport = null;
  }
}

export interface ConnectSocketOptions {
  wsUrl?: string;
  useReconnect?: boolean;
  mockModeOverride?: boolean;
}

export interface UseGameSocketOptions {
  /**
   * Jika true, koneksi WebSocket dan interval heartbeat otomatis dibersihkan saat
   * komponen pemanggil di-unmount (cocok untuk root/provider utama).
   */
  disconnectOnUnmount?: boolean;
}

export function useGameSocket(hookOptions: UseGameSocketOptions = {}) {
  const { disconnectOnUnmount = false } = hookOptions;

  useEffect(() => {
    if (!disconnectOnUnmount) return;

    const handleBeforeUnload = () => {
      disconnectActiveTransport();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
      disconnectActiveTransport();
      useGameStore.getState().setConnectionStatus('disconnected');
    };
  }, [disconnectOnUnmount]);
  const connectionStatus = useGameStore((s) => s.connectionStatus);
  const mockMode = useGameStore((s) => s.mockMode);
  const wsUrl = useGameStore((s) => s.wsUrl);
  const playerName = useGameStore((s) => s.playerName);
  const playerId = useGameStore((s) => s.playerId);
  const token = useGameStore((s) => s.token);
  const lastPongAt = useGameStore((s) => s.lastPongAt);
  const lastError = useGameStore((s) => s.lastError);
  const phase = useGameStore((s) => s.phase);
  const room = useGameStore((s) => s.room);
  const board = useGameStore((s) => s.board);
  const turnOrder = useGameStore((s) => s.turnOrder);
  const positions = useGameStore((s) => s.positions);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const lastMove = useGameStore((s) => s.lastMove);
  const activeQuestion = useGameStore((s) => s.activeQuestion);
  const lastAnswerResult = useGameStore((s) => s.lastAnswerResult);
  const quizStatsByPlayer = useGameStore((s) => s.quizStatsByPlayer);
  const gameOver = useGameStore((s) => s.gameOver);
  const startedAt = useGameStore((s) => s.startedAt);
  const logs = useGameStore((s) => s.logs);
  const toasts = useGameStore((s) => s.toasts);

  const dismissToast = useGameStore((s) => s.dismissToast);
  const clearToasts = useGameStore((s) => s.clearToasts);
  const returnToLanding = useGameStore((s) => s.returnToLanding);

  const connect = useCallback(
    (nameInput?: string, options: ConnectSocketOptions = {}) => {
      const store = useGameStore.getState();
      const targetName = (nameInput ?? store.playerName).trim();

      if (!targetName) {
        store.pushToast({
          severity: 'warning',
          title: 'Nama Pemain Wajib Diisi',
          message: 'Masukkan nama pemain sebelum terhubung ke server.',
        });
        return;
      }

      const targetMockMode = options.mockModeOverride ?? store.mockMode;
      const targetUrl = (options.wsUrl ?? store.wsUrl).trim();

      store.setPlayerName(targetName);
      if (options.wsUrl) {
        store.setWsUrl(targetUrl);
      }

      // Putuskan transport lama dengan bersih agar heartbeat/timer tidak bocor
      disconnectActiveTransport();

      const transport = createTransport(targetMockMode);
      activeTransport = transport;

      const storedSession = loadStoredSession();
      const reconnectToken = store.token ?? storedSession?.token;

      transport.connect(
        {
          url: targetUrl,
          playerName: targetName,
          token: reconnectToken ?? undefined,
          useReconnect: Boolean(options.useReconnect && reconnectToken),
          heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
        },
        {
          onStatusChange: (status) => {
            useGameStore.getState().setConnectionStatus(status);
          },
          onRawMessage: (rawJson) => {
            const parsed = parseServerEvent(rawJson);
            if (!parsed) return;
            useGameStore.getState().applyServerEvent(parsed);
          },
          onTransportError: (message) => {
            const currentStore = useGameStore.getState();
            currentStore.pushToast({
              severity: 'error',
              title: 'Koneksi Bermasalah',
              message,
            });
            currentStore.appendLog('error', message);
          },
        },
      );
    },
    [],
  );

  const reconnect = useCallback(() => {
    const store = useGameStore.getState();
    const stored = loadStoredSession();
    const name = store.playerName || stored?.playerName || 'Pemain';
    const hasToken = Boolean(store.token || stored?.token);

    connect(name, { useReconnect: hasToken });
  }, [connect]);

  const disconnect = useCallback(() => {
    disconnectActiveTransport();
    useGameStore.getState().setConnectionStatus('disconnected');
  }, []);

  const setMockMode = useCallback((enabled: boolean) => {
    const store = useGameStore.getState();
    if (store.mockMode === enabled) return;

    disconnectActiveTransport();
    store.setConnectionStatus('disconnected');
    store.setMockMode(enabled);
    store.returnToLanding();
    store.pushToast({
      severity: 'info',
      title: enabled ? 'Mock Mode Aktif' : 'Mode WebSocket Asli',
      message: enabled
        ? 'Simulasi lokal ULTA/1.0 aktif (tidak membutuhkan server VPS).'
        : 'Siap terhubung ke server WebSocket Bridge VPS.',
    });
  }, []);

  const sendMessage = useCallback((payload: ClientMessagePayload): boolean => {
    if (!activeTransport || activeTransport.getStatus() !== 'connected') {
      useGameStore.getState().pushToast({
        severity: 'warning',
        title: 'Belum Terhubung',
        message: 'Hubungkan ke server permainan terlebih dahulu.',
      });
      return false;
    }

    const sent = activeTransport.send(payload);
    return sent !== null;
  }, []);

  const createRoom = useCallback(
    (maxPlayers: number) => {
      const clamped = Math.max(2, Math.min(5, Math.round(maxPlayers)));
      return sendMessage({ type: 'CREATE_ROOM', max_players: clamped });
    },
    [sendMessage],
  );

  const joinRoom = useCallback(
    (roomCode: string) => {
      const normalized = roomCode.trim().toUpperCase();
      return sendMessage({ type: 'JOIN_ROOM', room_code: normalized });
    },
    [sendMessage],
  );

  const toggleReady = useCallback(() => {
    return sendMessage({ type: 'READY' });
  }, [sendMessage]);

  const startGame = useCallback(() => {
    return sendMessage({ type: 'START' });
  }, [sendMessage]);

  const rollDice = useCallback(() => {
    return sendMessage({ type: 'ROLL' });
  }, [sendMessage]);

  const submitAnswer = useCallback(
    (qId: string, choice: QuizChoice) => {
      return sendMessage({ type: 'ANSWER', q_id: qId, choice });
    },
    [sendMessage],
  );

  const leaveRoom = useCallback(() => {
    const sent = sendMessage({ type: 'LEAVE' });
    useGameStore.getState().returnToLanding();
    return sent;
  }, [sendMessage]);

  const derived = useMemo(() => {
    const myPlayer =
      room?.players.find((p) => p.playerId === playerId) ?? null;
    const isHost = Boolean(
      playerId && room && (room.hostId === playerId || myPlayer?.isHost),
    );
    const allReady = Boolean(
      room && room.players.length >= 2 && room.players.every((p) => p.ready),
    );
    const canStartGame = isHost && allReady && phase === 'lobby';
    const isMyTurn = Boolean(
      phase === 'playing' &&
        playerId &&
        currentTurn?.playerId === playerId &&
        !activeQuestion,
    );
    const isAnsweringQuestion = Boolean(
      phase === 'playing' &&
        playerId &&
        activeQuestion?.playerId === playerId,
    );

    return {
      myPlayer,
      isHost,
      allReady,
      canStartGame,
      isMyTurn,
      isAnsweringQuestion,
    };
  }, [room, playerId, phase, currentTurn, activeQuestion]);

  return {
    // State
    connectionStatus,
    mockMode,
    wsUrl,
    playerName,
    playerId,
    token,
    lastPongAt,
    lastError,
    phase,
    room,
    board,
    turnOrder,
    positions,
    currentTurn,
    lastMove,
    activeQuestion,
    lastAnswerResult,
    quizStatsByPlayer,
    gameOver,
    startedAt,
    logs,
    toasts,
    // Derived selectors
    ...derived,
    // Actions
    connect,
    reconnect,
    disconnect,
    setMockMode,
    sendMessage,
    createRoom,
    joinRoom,
    toggleReady,
    startGame,
    rollDice,
    submitAnswer,
    leaveRoom,
    dismissToast,
    clearToasts,
    returnToLanding,
  };
}
