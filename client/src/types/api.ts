export type DataSourceMode = 'api' | 'local';

export type LocalFallbackReason =
  | 'mock-mode'
  | 'not-configured'
  | 'api-unreachable';

export interface LeaderboardEntry {
  rank: number;
  id: number;
  playerName: string;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  questionsAnswered: number;
  questionsCorrect: number;
  quizAccuracy: number;
  averagePosition: number;
  lastPlayedAt: string | null;
}

export interface MatchParticipantRecord {
  id: number;
  playerId: string | null;
  playerName: string;
  rank: number;
  finalPosition: number;
  isWinner: boolean;
  questionsAnswered: number;
  questionsCorrect: number;
}

export interface MatchHistoryRecord {
  id: number;
  matchKey: string | null;
  roomCode: string;
  winnerName: string;
  totalPlayers: number;
  startedAt: string | null;
  finishedAt: string;
  participants: MatchParticipantRecord[];
}

export interface SaveMatchPayload {
  matchKey?: string;
  roomCode: string;
  winnerName: string;
  startedAt?: string;
  finishedAt?: string;
  participants: Array<{
    playerId?: string;
    playerName: string;
    rank: number;
    finalPosition?: number;
    isWinner?: boolean;
    questionsAnswered?: number;
    questionsCorrect?: number;
  }>;
}

export interface LeaderboardResponse {
  items: LeaderboardEntry[];
  total: number;
  source: DataSourceMode;
  fallbackReason?: LocalFallbackReason;
  errorMessage?: string;
}

export interface MatchHistoryResponse {
  items: MatchHistoryRecord[];
  total: number;
  source: DataSourceMode;
  fallbackReason?: LocalFallbackReason;
  errorMessage?: string;
}

export interface SaveMatchResultResponse {
  ok: boolean;
  source: DataSourceMode;
  deduplicated: boolean;
  savedLocally: boolean;
  match?: MatchHistoryRecord;
  errorMessage?: string;
}
