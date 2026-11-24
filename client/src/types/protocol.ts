export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

export type GamePhase = 'landing' | 'lobby' | 'playing' | 'gameover';

export type TileEffect = 'NORMAL' | 'SNAKE' | 'LADDER' | 'QUESTION';

export type QuizChoice = 'A' | 'B' | 'C' | 'D';

export type PlayerConnectionState = 'online' | 'offline' | 'left';

export type ProtocolErrorCode =
  | 400
  | 401
  | 403
  | 404
  | 408
  | 409
  | 413
  | 429
  | 500
  | number;

export const PROTOCOL_ERROR_MESSAGES: Record<number, string> = {
  400: 'Permintaan tidak valid. Periksa data yang dikirim.',
  401: 'Sesi tidak valid atau belum terautentikasi. Silakan hubungkan ulang.',
  403: 'Aksi tidak diizinkan saat ini (bukan giliran Anda atau bukan host).',
  404: 'Room atau data yang dicari tidak ditemukan.',
  408: 'Waktu habis! Server memproses aksi otomatis atau memutus sesi.',
  409: 'Konflik status room (room penuh, sudah dimulai, atau belum siap).',
  413: 'Ukuran pesan terlalu besar untuk protokol ULTA/1.0.',
  429: 'Terlalu banyak permintaan dalam waktu singkat. Mohon tunggu sebentar.',
  500: 'Terjadi kesalahan internal pada server permainan.',
};

// ============================================================================
// Client -> Server Flat JSON Messages (wajib type & seq)
// ============================================================================

export type ClientMessagePayload =
  | { type: 'HELLO'; name: string }
  | { type: 'CREATE_ROOM'; max_players: number }
  | { type: 'JOIN_ROOM'; room_code: string }
  | { type: 'READY' }
  | { type: 'START' }
  | { type: 'ROLL' }
  | { type: 'ANSWER'; q_id: string; choice: QuizChoice }
  | { type: 'PING' }
  | { type: 'LEAVE' }
  | { type: 'RECONNECT'; token: string };

export type ClientMessage = ClientMessagePayload & {
  seq: number;
};

// ============================================================================
// Domain Entities (Normalized dari Server -> Client)
// ============================================================================

export interface BoardCell {
  index: number;
  type: TileEffect;
  to?: number;
}

export interface RoomPlayer {
  playerId: string;
  name: string;
  ready: boolean;
  online: boolean;
  status: PlayerConnectionState;
  isHost: boolean;
  position: number;
  colorIndex: number;
}

export interface RoomStateData {
  roomCode: string;
  hostId: string | null;
  maxPlayers: number;
  status: string;
  players: RoomPlayer[];
}

export interface RankingEntry {
  rank: number;
  playerId?: string;
  name: string;
  position: number;
  isWinner: boolean;
}

// ============================================================================
// Server -> Client Normalized Events
// ============================================================================

export interface WelcomeEvent {
  type: 'WELCOME';
  seq?: number;
  playerId: string;
  token: string;
  name?: string;
}

export interface RoomStateEvent extends RoomStateData {
  type: 'ROOM_STATE';
  seq?: number;
}

export interface GameStartEvent {
  type: 'GAME_START';
  seq?: number;
  roomCode?: string;
  board: BoardCell[];
  turnOrder: string[];
  players?: RoomPlayer[];
}

export interface TurnEvent {
  type: 'TURN';
  seq?: number;
  playerId: string;
  deadline: number;
}

export interface MoveEvent {
  type: 'MOVE';
  seq?: number;
  playerId: string;
  dice: number;
  from: number;
  path: number[];
  effect: TileEffect;
  to: number;
}

export interface QuestionEvent {
  type: 'QUESTION';
  seq?: number;
  qId: string;
  playerId: string;
  prompt: string;
  options: Record<QuizChoice, string>;
  deadline: number;
  category?: string;
}

export interface AnswerResultEvent {
  type: 'ANSWER_RESULT';
  seq?: number;
  playerId: string;
  bonusDice: number;
  to: number;
  from?: number;
  qId?: string;
  /**
   * Opsional: hanya dikirim server kepada pemain yang menjawab.
   * Pemain lain tidak menerima field ini dan menyimpulkan dari perubahan posisi.
   */
  correct?: boolean;
}

export interface PlayerStatusEvent {
  type: 'PLAYER_STATUS';
  seq?: number;
  playerId: string;
  status: PlayerConnectionState;
  name?: string;
}

export interface GameOverEvent {
  type: 'GAME_OVER';
  seq?: number;
  winnerId?: string;
  winnerName: string;
  ranking: RankingEntry[];
}

export interface PongEvent {
  type: 'PONG';
  seq?: number;
  timestamp?: number;
}

export interface ErrorEvent {
  type: 'ERROR';
  seq?: number;
  code: ProtocolErrorCode;
  message: string;
}

export type ServerEvent =
  | WelcomeEvent
  | RoomStateEvent
  | GameStartEvent
  | TurnEvent
  | MoveEvent
  | QuestionEvent
  | AnswerResultEvent
  | PlayerStatusEvent
  | GameOverEvent
  | PongEvent
  | ErrorEvent;

// ============================================================================
// UI Support State Models (Logs & Toasts)
// ============================================================================

export type ToastSeverity = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  severity: ToastSeverity;
  code?: number;
  title: string;
  message: string;
  createdAt: number;
}

export type LogCategory =
  | 'system'
  | 'room'
  | 'turn'
  | 'move'
  | 'quiz'
  | 'status'
  | 'error'
  | 'gameover';

export interface GameLogEntry {
  id: string;
  category: LogCategory;
  message: string;
  timestamp: number;
}

export interface StoredSession {
  playerId: string;
  token: string;
  playerName: string;
  roomCode?: string;
}
