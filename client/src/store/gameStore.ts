import { create } from 'zustand';
import {
  clearStoredSession,
  loadStoredSession,
  saveStoredSession,
  updateStoredSessionRoom,
} from '../services/sessionStorage';
import type {
  AnswerResultEvent,
  BoardCell,
  ConnectionStatus,
  ErrorEvent,
  GameLogEntry,
  GameOverEvent,
  GamePhase,
  LogCategory,
  MoveEvent,
  QuestionEvent,
  RoomStateData,
  ServerEvent,
  ToastItem,
  ToastSeverity,
} from '../types/protocol';

export interface ActiveTurnState {
  playerId: string;
  deadline: number;
  startedAt: number;
}

export interface ActiveQuestionState extends QuestionEvent {
  startedAt: number;
}

export interface ResolvedAnswerState extends AnswerResultEvent {
  from: number;
  inferredCorrect: boolean;
}

export interface PlayerQuizCounter {
  answered: number;
  correct: number;
}

export interface QueuedPresentationEvent {
  id: number;
  event: ServerEvent;
}

export interface GameStoreState {
  connectionStatus: ConnectionStatus;
  mockMode: boolean;
  wsUrl: string;
  playerName: string;
  playerId: string | null;
  token: string | null;
  lastPongAt: number | null;
  lastError: ErrorEvent | null;

  phase: GamePhase;
  room: RoomStateData | null;
  board: BoardCell[];
  turnOrder: string[];
  positions: Record<string, number>;
  currentTurn: ActiveTurnState | null;
  lastMove: MoveEvent | null;
  activeQuestion: ActiveQuestionState | null;
  lastAnswerResult: ResolvedAnswerState | null;
  quizStatsByPlayer: Record<string, PlayerQuizCounter>;
  gameOver: GameOverEvent | null;
  startedAt: string | null;
  /**
   * Antrean event terurut dari server untuk diputar satu per satu oleh
   * lapisan Presentation Queue agar animasi & pop-up tidak saling menimpa.
   */
  presentationEvents: QueuedPresentationEvent[];

  logs: GameLogEntry[];
  toasts: ToastItem[];
}

export interface GameStoreActions {
  setConnectionStatus: (status: ConnectionStatus) => void;
  setMockMode: (enabled: boolean) => void;
  setWsUrl: (url: string) => void;
  setPlayerName: (name: string) => void;
  applyServerEvent: (event: ServerEvent) => void;
  pushToast: (input: {
    severity: ToastSeverity;
    title: string;
    message: string;
    code?: number;
  }) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
  appendLog: (category: LogCategory, message: string) => void;
  resetSession: () => void;
  returnToLanding: () => void;
}

export type GameStore = GameStoreState & GameStoreActions;

const MAX_LOGS = 100;
const MAX_TOASTS = 6;
const MAX_PRESENTATION_EVENTS = 80;

let uidCounter = 0;
let presentationSeq = 0;
function nextUid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}_${Date.now()}_${uidCounter}`;
}

function appendPresentationEvent(
  queue: QueuedPresentationEvent[],
  event: ServerEvent,
): QueuedPresentationEvent[] {
  presentationSeq += 1;
  const next = [...queue, { id: presentationSeq, event }];
  return next.length > MAX_PRESENTATION_EVENTS
    ? next.slice(next.length - MAX_PRESENTATION_EVENTS)
    : next;
}

function getDefaultWsUrl(): string {
  try {
    const envUrl = import.meta.env?.VITE_WS_URL;
    if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
      return envUrl.trim();
    }
  } catch {
    // Fallback untuk lingkungan non-Vite (unit test Node)
  }
  return 'ws://localhost:8080';
}

function getDefaultMockMode(): boolean {
  try {
    return import.meta.env?.VITE_ENABLE_MOCK_MODE === 'true';
  } catch {
    return false;
  }
}

function createLogEntry(category: LogCategory, message: string): GameLogEntry {
  return {
    id: nextUid('log'),
    category,
    message,
    timestamp: Date.now(),
  };
}

function appendLogBounded(
  logs: GameLogEntry[],
  category: LogCategory,
  message: string,
): GameLogEntry[] {
  const next = [...logs, createLogEntry(category, message)];
  return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next;
}

function appendToastBounded(
  toasts: ToastItem[],
  item: Omit<ToastItem, 'id' | 'createdAt'>,
): ToastItem[] {
  const next: ToastItem[] = [
    ...toasts,
    {
      ...item,
      id: nextUid('toast'),
      createdAt: Date.now(),
    },
  ];
  return next.length > MAX_TOASTS
    ? next.slice(next.length - MAX_TOASTS)
    : next;
}

function resolvePlayerDisplayName(
  state: GameStoreState,
  playerId: string,
  fallback?: string,
): string {
  const found = state.room?.players.find((p) => p.playerId === playerId);
  if (found) return found.name;
  if (playerId === state.playerId && state.playerName) return state.playerName;
  return fallback ?? playerId;
}

export function createInitialGameState(): GameStoreState {
  const stored = loadStoredSession();

  return {
    connectionStatus: 'disconnected',
    mockMode: getDefaultMockMode(),
    wsUrl: getDefaultWsUrl(),
    playerName: stored?.playerName ?? '',
    playerId: stored?.playerId ?? null,
    token: stored?.token ?? null,
    lastPongAt: null,
    lastError: null,

    phase: 'landing',
    room: null,
    board: [],
    turnOrder: [],
    positions: {},
    currentTurn: null,
    lastMove: null,
    activeQuestion: null,
    lastAnswerResult: null,
    quizStatsByPlayer: {},
    gameOver: null,
    startedAt: null,
    presentationEvents: [],

    logs: [],
    toasts: [],
  };
}

/**
 * Pure state reducer untuk event ULTA/1.0 dari server.
 * Mematuhi prinsip Authoritative Server: posisi, giliran, hasil soal, dan pemenang
 * hanya diperbarui berdasarkan event dari server.
 */
export function reduceServerEvent(
  state: GameStoreState,
  event: ServerEvent,
): Partial<GameStoreState> {
  switch (event.type) {
    case 'WELCOME': {
      const resolvedName = event.name ?? state.playerName;
      saveStoredSession({
        playerId: event.playerId,
        token: event.token,
        playerName: resolvedName,
        ...(state.room?.roomCode ? { roomCode: state.room.roomCode } : {}),
      });

      return {
        playerId: event.playerId,
        token: event.token,
        playerName: resolvedName,
        logs: appendLogBounded(
          state.logs,
          'system',
          `Terhubung sebagai ${resolvedName || event.playerId}.`,
        ),
      };
    }

    case 'ROOM_STATE': {
      updateStoredSessionRoom(event.roomCode || undefined);

      const nextPositions: Record<string, number> = { ...state.positions };
      for (const player of event.players) {
        if (nextPositions[player.playerId] === undefined || state.phase !== 'playing') {
          nextPositions[player.playerId] = player.position;
        }
      }

      const nextPhase: GamePhase =
        event.status === 'PLAYING'
          ? 'playing'
          : event.status === 'FINISHED'
            ? 'gameover'
            : 'lobby';

      const roomChanged = state.room?.roomCode !== event.roomCode;
      const logs = roomChanged && event.roomCode
        ? appendLogBounded(
            state.logs,
            'room',
            `Masuk ke room ${event.roomCode} (${event.players.length}/${event.maxPlayers} pemain).`,
          )
        : state.logs;

      return {
        room: {
          roomCode: event.roomCode,
          hostId: event.hostId,
          maxPlayers: event.maxPlayers,
          status: event.status,
          players: event.players,
        },
        positions: nextPositions,
        phase: nextPhase,
        logs,
      };
    }

    case 'GAME_START': {
      const players = event.players ?? state.room?.players ?? [];
      const positions: Record<string, number> = {};
      const quizStatsByPlayer: Record<string, PlayerQuizCounter> = {};

      for (const id of event.turnOrder) {
        positions[id] = 1;
        quizStatsByPlayer[id] = { answered: 0, correct: 0 };
      }
      for (const player of players) {
        positions[player.playerId] = player.position || 1;
        if (!quizStatsByPlayer[player.playerId]) {
          quizStatsByPlayer[player.playerId] = { answered: 0, correct: 0 };
        }
      }

      const updatedRoom: RoomStateData | null = state.room
        ? {
            ...state.room,
            roomCode: event.roomCode ?? state.room.roomCode,
            status: 'PLAYING',
            players: players.map((p) => ({ ...p, position: positions[p.playerId] ?? 1 })),
          }
        : event.roomCode
          ? {
              roomCode: event.roomCode,
              hostId: players.find((p) => p.isHost)?.playerId ?? null,
              maxPlayers: Math.max(2, players.length),
              status: 'PLAYING',
              players,
            }
          : null;

      return {
        phase: 'playing',
        room: updatedRoom,
        board: event.board,
        turnOrder: event.turnOrder,
        positions,
        currentTurn: null,
        lastMove: null,
        activeQuestion: null,
        lastAnswerResult: null,
        quizStatsByPlayer,
        gameOver: null,
        startedAt: new Date().toISOString(),
        presentationEvents: appendPresentationEvent([], event),
        logs: appendLogBounded(
          state.logs,
          'room',
          'Permainan dimulai! Papan 100 petak acak telah diterima dari server.',
        ),
      };
    }

    case 'TURN': {
      const name = resolvePlayerDisplayName(state, event.playerId);
      return {
        currentTurn: {
          playerId: event.playerId,
          deadline: event.deadline,
          startedAt: Date.now(),
        },
        activeQuestion: null,
        presentationEvents: appendPresentationEvent(
          state.presentationEvents,
          event,
        ),
        logs: appendLogBounded(
          state.logs,
          'turn',
          `Giliran ${name} untuk melempar dadu (${event.deadline} detik).`,
        ),
      };
    }

    case 'MOVE': {
      const name = resolvePlayerDisplayName(state, event.playerId);
      const nextPositions: Record<string, number> = {
        ...state.positions,
        [event.playerId]: event.to,
      };

      const nextRoom: RoomStateData | null = state.room
        ? {
            ...state.room,
            players: state.room.players.map((p) =>
              p.playerId === event.playerId ? { ...p, position: event.to } : p,
            ),
          }
        : null;

      let logMsg = `${name} melempar dadu ${event.dice} (${event.from} → ${event.to}).`;
      if (event.effect === 'LADDER') {
        logMsg = `${name} melempar ${event.dice} dan naik tangga ke petak ${event.to}!`;
      } else if (event.effect === 'SNAKE') {
        logMsg = `${name} melempar ${event.dice} dan digigit ular turun ke petak ${event.to}!`;
      } else if (event.effect === 'QUESTION') {
        logMsg = `${name} melempar ${event.dice} dan mendarat di petak Soal IT (${event.to}).`;
      }

      return {
        positions: nextPositions,
        room: nextRoom,
        lastMove: event,
        presentationEvents: appendPresentationEvent(
          state.presentationEvents,
          event,
        ),
        logs: appendLogBounded(state.logs, 'move', logMsg),
      };
    }

    case 'QUESTION': {
      const name = resolvePlayerDisplayName(state, event.playerId);
      return {
        activeQuestion: {
          ...event,
          startedAt: Date.now(),
        },
        presentationEvents: appendPresentationEvent(
          state.presentationEvents,
          event,
        ),
        logs: appendLogBounded(
          state.logs,
          'quiz',
          `${name} sedang menjawab soal IT (${event.deadline} detik)...`,
        ),
      };
    }

    case 'ANSWER_RESULT': {
      const name = resolvePlayerDisplayName(state, event.playerId);
      const previousPos =
        event.from ?? state.positions[event.playerId] ?? 1;

      // Jika `correct` tidak dikirim (mode penonton), simpulkan dari perubahan posisi
      const inferredCorrect =
        event.correct !== undefined
          ? event.correct
          : event.to > previousPos || (previousPos === 100 && event.to === 100);

      const nextPositions: Record<string, number> = {
        ...state.positions,
        [event.playerId]: event.to,
      };

      const nextRoom: RoomStateData | null = state.room
        ? {
            ...state.room,
            players: state.room.players.map((p) =>
              p.playerId === event.playerId ? { ...p, position: event.to } : p,
            ),
          }
        : null;

      const prevCounter = state.quizStatsByPlayer[event.playerId] ?? {
        answered: 0,
        correct: 0,
      };
      const nextQuizStats = {
        ...state.quizStatsByPlayer,
        [event.playerId]: {
          answered: prevCounter.answered + 1,
          correct: prevCounter.correct + (inferredCorrect ? 1 : 0),
        },
      };

      const outcomeText = inferredCorrect
        ? `${name} menjawab BENAR! Maju +${event.bonusDice} ke petak ${event.to}.`
        : `${name} menjawab SALAH/waktu habis. Mundur -${event.bonusDice} ke petak ${event.to}.`;

      return {
        activeQuestion: null,
        positions: nextPositions,
        room: nextRoom,
        quizStatsByPlayer: nextQuizStats,
        lastAnswerResult: {
          ...event,
          from: previousPos,
          inferredCorrect,
        },
        presentationEvents: appendPresentationEvent(state.presentationEvents, {
          ...event,
          from: previousPos,
        }),
        logs: appendLogBounded(state.logs, 'quiz', outcomeText),
      };
    }

    case 'PLAYER_STATUS': {
      const name = resolvePlayerDisplayName(state, event.playerId, event.name);
      const isSelfLeft =
        event.playerId === state.playerId && event.status === 'left';

      if (isSelfLeft) {
        updateStoredSessionRoom(undefined);
        return {
          phase: 'landing',
          room: null,
          board: [],
          turnOrder: [],
          positions: {},
          currentTurn: null,
          lastMove: null,
          activeQuestion: null,
          lastAnswerResult: null,
          gameOver: null,
          startedAt: null,
          presentationEvents: [],
          logs: appendLogBounded(state.logs, 'status', 'Anda keluar dari room.'),
        };
      }

      const nextRoom: RoomStateData | null = state.room
        ? {
            ...state.room,
            players: state.room.players.map((p) =>
              p.playerId === event.playerId
                ? {
                    ...p,
                    status: event.status,
                    online: event.status === 'online',
                  }
                : p,
            ),
          }
        : null;

      const statusLabel =
        event.status === 'online'
          ? 'kembali online'
          : event.status === 'offline'
            ? 'terputus (offline)'
            : 'keluar dari room';

      return {
        room: nextRoom,
        logs: appendLogBounded(
          state.logs,
          'status',
          `${name} ${statusLabel}.`,
        ),
        ...(event.status === 'offline'
          ? {
              toasts: appendToastBounded(state.toasts, {
                severity: 'warning',
                title: 'Pemain Offline',
                message: `${name} terputus. Gilirannya akan dilewati sementara.`,
              }),
            }
          : {}),
      };
    }

    case 'GAME_OVER': {
      return {
        phase: 'gameover',
        currentTurn: null,
        activeQuestion: null,
        gameOver: event,
        room: state.room ? { ...state.room, status: 'FINISHED' } : null,
        presentationEvents: appendPresentationEvent(
          state.presentationEvents,
          event,
        ),
        logs: appendLogBounded(
          state.logs,
          'gameover',
          `Permainan selesai! Pemenang: ${event.winnerName}.`,
        ),
      };
    }

    case 'PONG': {
      return {
        lastPongAt: event.timestamp ?? Date.now(),
      };
    }

    case 'ERROR': {
      return {
        lastError: event,
        toasts: appendToastBounded(state.toasts, {
          severity: 'error',
          code: event.code,
          title: `Error ${event.code}`,
          message: event.message,
        }),
        logs: appendLogBounded(
          state.logs,
          'error',
          `[ERROR ${event.code}] ${event.message}`,
        ),
      };
    }
  }
}

export const useGameStore = create<GameStore>((set) => ({
  ...createInitialGameState(),

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  setMockMode: (enabled) => set({ mockMode: enabled }),

  setWsUrl: (url) => set({ wsUrl: url }),

  setPlayerName: (name) => set({ playerName: name }),

  applyServerEvent: (event) =>
    set((state) => reduceServerEvent(state, event)),

  pushToast: (input) =>
    set((state) => ({
      toasts: appendToastBounded(state.toasts, input),
    })),

  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),

  clearToasts: () => set({ toasts: [] }),

  appendLog: (category, message) =>
    set((state) => ({
      logs: appendLogBounded(state.logs, category, message),
    })),

  resetSession: () => {
    clearStoredSession();
    set((state) => ({
      ...createInitialGameState(),
      mockMode: state.mockMode,
      wsUrl: state.wsUrl,
    }));
  },

  returnToLanding: () => {
    updateStoredSessionRoom(undefined);
    set({
      phase: 'landing',
      room: null,
      board: [],
      turnOrder: [],
      positions: {},
      currentTurn: null,
      lastMove: null,
      activeQuestion: null,
      lastAnswerResult: null,
      quizStatsByPlayer: {},
      gameOver: null,
      startedAt: null,
      presentationEvents: [],
    });
  },
}));
