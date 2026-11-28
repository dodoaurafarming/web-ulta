import type {
  LeaderboardEntry,
  LeaderboardResponse,
  MatchHistoryRecord,
  MatchHistoryResponse,
  SaveMatchPayload,
  SaveMatchResultResponse,
} from '../types/api';

const LOCAL_MATCHES_KEY = 'ulta_local_matches_v1';
const MAX_LOCAL_MATCHES = 60;
const DUPLICATE_WINDOW_MS = 2 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

// Mencegah pengiriman ganda simultan ke /api/matches untuk matchKey yang sama pada tab yang sama
const inFlightSyncMap = new Map<string, Promise<SaveMatchResultResponse>>();
const syncedApiKeys = new Set<string>();

function roundOneDecimal(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(1));
}

function roundPercentage(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return roundOneDecimal((numerator / denominator) * 100);
}

/**
 * Mengambil base URL REST API dari env `VITE_API_URL`.
 * Mendukung bentuk `https://host/api` maupun `https://host` (otomatis ditambah `/api`).
 * Mengembalikan `null` jika belum dikonfigurasi.
 */
export function getConfiguredApiBaseUrl(): string | null {
  try {
    const raw = import.meta.env?.VITE_API_URL;
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim().replace(/\/+$/, '');
    if (!trimmed) return null;
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  } catch {
    return null;
  }
}

export function isApiConfigured(): boolean {
  return getConfiguredApiBaseUrl() !== null;
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadLocalMatches(): MatchHistoryRecord[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(LOCAL_MATCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as MatchHistoryRecord[];
  } catch {
    return [];
  }
}

function persistLocalMatches(matches: MatchHistoryRecord[]): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(
      LOCAL_MATCHES_KEY,
      JSON.stringify(matches.slice(0, MAX_LOCAL_MATCHES)),
    );
  } catch {
    // Abaikan quota error pada mode private browsing
  }
}

function isSameMatchRecord(
  existing: MatchHistoryRecord,
  payload: SaveMatchPayload,
  finishedMs: number,
): boolean {
  if (payload.matchKey && existing.matchKey === payload.matchKey) {
    return true;
  }

  const sameRoom =
    existing.roomCode.toUpperCase() === payload.roomCode.trim().toUpperCase();
  const sameWinner =
    existing.winnerName.trim().toLowerCase() ===
    payload.winnerName.trim().toLowerCase();

  if (sameRoom && sameWinner) {
    const existingMs = Date.parse(existing.finishedAt);
    if (
      Number.isFinite(existingMs) &&
      Math.abs(existingMs - finishedMs) <= DUPLICATE_WINDOW_MS
    ) {
      return true;
    }
  }

  return false;
}

export function saveMatchLocally(payload: SaveMatchPayload): {
  match: MatchHistoryRecord;
  deduplicated: boolean;
} {
  const existingMatches = loadLocalMatches();
  const finishedAt = payload.finishedAt ?? new Date().toISOString();
  const finishedMs = Date.parse(finishedAt) || Date.now();

  const duplicate = existingMatches.find((record) =>
    isSameMatchRecord(record, payload, finishedMs),
  );
  if (duplicate) {
    return {
      match: duplicate,
      deduplicated: true,
    };
  }

  const nextId =
    existingMatches.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  const normalizedWinner = payload.winnerName.trim();

  const record: MatchHistoryRecord = {
    id: nextId,
    matchKey: payload.matchKey ?? null,
    roomCode: payload.roomCode.trim().toUpperCase(),
    winnerName: normalizedWinner,
    totalPlayers: payload.participants.length,
    startedAt: payload.startedAt ?? null,
    finishedAt,
    participants: payload.participants
      .map((p, idx) => {
        const name = p.playerName.trim();
        const isWinner =
          p.isWinner ??
          (p.rank === 1 ||
            name.toLowerCase() === normalizedWinner.toLowerCase());
        return {
          id: nextId * 100 + idx + 1,
          playerId: p.playerId ?? null,
          playerName: name,
          rank: p.rank,
          finalPosition: Math.max(1, Math.min(100, p.finalPosition ?? 1)),
          isWinner,
          questionsAnswered: Math.max(0, p.questionsAnswered ?? 0),
          questionsCorrect: Math.max(0, p.questionsCorrect ?? 0),
        };
      })
      .sort((a, b) => a.rank - b.rank),
  };

  persistLocalMatches([record, ...existingMatches]);
  return {
    match: record,
    deduplicated: false,
  };
}

/**
 * Mengagregasi data pertandingan lokal menjadi tabel Leaderboard dengan
 * rumus & urutan yang identik dengan backend Express + Prisma.
 */
export function buildLocalLeaderboard(
  matches: MatchHistoryRecord[],
  search?: string,
): LeaderboardEntry[] {
  const map = new Map<
    string,
    {
      playerName: string;
      gamesPlayed: number;
      gamesWon: number;
      questionsAnswered: number;
      questionsCorrect: number;
      positionSum: number;
      lastPlayedAt: string | null;
    }
  >();

  for (const match of matches) {
    for (const p of match.participants) {
      const key = p.playerName.trim().toLowerCase();
      if (!key) continue;

      const current = map.get(key) ?? {
        playerName: p.playerName.trim(),
        gamesPlayed: 0,
        gamesWon: 0,
        questionsAnswered: 0,
        questionsCorrect: 0,
        positionSum: 0,
        lastPlayedAt: null,
      };

      current.gamesPlayed += 1;
      if (p.isWinner || p.rank === 1) {
        current.gamesWon += 1;
      }
      current.questionsAnswered += p.questionsAnswered;
      current.questionsCorrect += p.questionsCorrect;
      current.positionSum += p.finalPosition;

      if (
        !current.lastPlayedAt ||
        Date.parse(match.finishedAt) > Date.parse(current.lastPlayedAt)
      ) {
        current.lastPlayedAt = match.finishedAt;
      }

      map.set(key, current);
    }
  }

  const normalizedSearch = search?.trim().toLowerCase() ?? '';
  const sorted = Array.from(map.values())
    .filter(
      (entry) =>
        !normalizedSearch ||
        entry.playerName.toLowerCase().includes(normalizedSearch),
    )
    .sort((a, b) => {
      if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
      if (b.gamesPlayed !== a.gamesPlayed) return b.gamesPlayed - a.gamesPlayed;
      if (b.questionsCorrect !== a.questionsCorrect) {
        return b.questionsCorrect - a.questionsCorrect;
      }
      const avgA = a.positionSum / Math.max(1, a.gamesPlayed);
      const avgB = b.positionSum / Math.max(1, b.gamesPlayed);
      return avgB - avgA;
    });

  return sorted.map((entry, idx) => ({
    rank: idx + 1,
    id: idx + 1,
    playerName: entry.playerName,
    gamesPlayed: entry.gamesPlayed,
    gamesWon: entry.gamesWon,
    winRate: roundPercentage(entry.gamesWon, entry.gamesPlayed),
    questionsAnswered: entry.questionsAnswered,
    questionsCorrect: entry.questionsCorrect,
    quizAccuracy: roundPercentage(
      entry.questionsCorrect,
      entry.questionsAnswered,
    ),
    averagePosition: roundOneDecimal(
      entry.positionSum / Math.max(1, entry.gamesPlayed),
    ),
    lastPlayedAt: entry.lastPlayedAt,
  }));
}

async function fetchJsonWithTimeout<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });

    const json = (await response.json().catch(() => null)) as
      | { ok?: boolean; data?: T; message?: string; error?: string }
      | null;

    if (!response.ok || (json && json.ok === false)) {
      const msg =
        json?.message ||
        json?.error ||
        `HTTP ${response.status} saat mengakses API`;
      throw new Error(msg);
    }

    return json as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchLeaderboard(options?: {
  search?: string;
  limit?: number;
  preferLocal?: boolean;
}): Promise<LeaderboardResponse> {
  const limit = options?.limit ?? 50;
  const search = options?.search?.trim() || undefined;
  const apiBase = getConfiguredApiBaseUrl();

  const buildLocal = (
    fallbackReason: 'mock-mode' | 'not-configured' | 'api-unreachable',
    errorMessage?: string,
  ): LeaderboardResponse => {
    const matches = loadLocalMatches();
    const items = buildLocalLeaderboard(matches, search).slice(0, limit);
    return {
      items,
      total: items.length,
      source: 'local',
      fallbackReason,
      ...(errorMessage ? { errorMessage } : {}),
    };
  };

  if (options?.preferLocal) {
    return buildLocal('mock-mode');
  }

  if (!apiBase) {
    return buildLocal('not-configured');
  }

  try {
    const params = new URLSearchParams({ limit: String(limit), offset: '0' });
    if (search) params.set('search', search);

    const envelope = await fetchJsonWithTimeout<{
      ok: true;
      data: {
        items: LeaderboardEntry[];
        pagination?: { total: number };
      };
    }>(`${apiBase}/leaderboard?${params.toString()}`);

    const rawItems = envelope?.data?.items ?? [];
    const items: LeaderboardEntry[] = rawItems.map((entry, idx) => ({
      ...entry,
      rank: entry.rank ?? idx + 1,
      averagePosition:
        typeof entry.averagePosition === 'number' ? entry.averagePosition : 0,
    }));

    return {
      items,
      total: envelope?.data?.pagination?.total ?? items.length,
      source: 'api',
    };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Gagal menghubungi server API.';
    return buildLocal('api-unreachable', msg);
  }
}

export async function fetchMatchHistory(options?: {
  roomCode?: string;
  limit?: number;
  preferLocal?: boolean;
}): Promise<MatchHistoryResponse> {
  const limit = options?.limit ?? 20;
  const roomCode = options?.roomCode?.trim().toUpperCase() || undefined;
  const apiBase = getConfiguredApiBaseUrl();

  const buildLocal = (
    fallbackReason: 'mock-mode' | 'not-configured' | 'api-unreachable',
    errorMessage?: string,
  ): MatchHistoryResponse => {
    const matches = loadLocalMatches();
    const filtered = roomCode
      ? matches.filter((m) => m.roomCode.toUpperCase().includes(roomCode))
      : matches;
    const sliced = filtered.slice(0, limit);
    return {
      items: sliced,
      total: filtered.length,
      source: 'local',
      fallbackReason,
      ...(errorMessage ? { errorMessage } : {}),
    };
  };

  if (options?.preferLocal) {
    return buildLocal('mock-mode');
  }

  if (!apiBase) {
    return buildLocal('not-configured');
  }

  try {
    const params = new URLSearchParams({ limit: String(limit), offset: '0' });
    if (roomCode) params.set('roomCode', roomCode);

    const envelope = await fetchJsonWithTimeout<{
      ok: true;
      data: {
        items: MatchHistoryRecord[];
        pagination?: { total: number };
      };
    }>(`${apiBase}/matches?${params.toString()}`);

    const items = envelope?.data?.items ?? [];
    return {
      items,
      total: envelope?.data?.pagination?.total ?? items.length,
      source: 'api',
    };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Gagal memuat riwayat dari API.';
    return buildLocal('api-unreachable', msg);
  }
}

export async function syncMatchResult(
  payload: SaveMatchPayload,
  options?: { preferLocal?: boolean },
): Promise<SaveMatchResultResponse> {
  const apiBase = getConfiguredApiBaseUrl();
  const dedupeKey =
    payload.matchKey ??
    `${payload.roomCode}-${payload.winnerName}-${(payload.finishedAt ?? '').slice(0, 16)}`;

  // Mode simulasi atau API belum dikonfigurasi -> simpan langsung ke localStorage
  if (options?.preferLocal || !apiBase) {
    const localResult = saveMatchLocally(payload);
    return {
      ok: true,
      source: 'local',
      deduplicated: localResult.deduplicated,
      savedLocally: true,
      match: localResult.match,
    };
  }

  if (syncedApiKeys.has(dedupeKey)) {
    const localMirror = saveMatchLocally(payload);
    return {
      ok: true,
      source: 'api',
      deduplicated: true,
      savedLocally: true,
      match: localMirror.match,
    };
  }

  const existingInFlight = inFlightSyncMap.get(dedupeKey);
  if (existingInFlight) {
    return existingInFlight;
  }

  const task = (async (): Promise<SaveMatchResultResponse> => {
    try {
      const envelope = await fetchJsonWithTimeout<{
        ok: true;
        data: MatchHistoryRecord;
        meta?: { deduplicated?: boolean };
      }>(`${apiBase}/matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      syncedApiKeys.add(dedupeKey);
      // Simpan juga salinan lokal agar tetap tersedia saat offline
      saveMatchLocally(payload);

      return {
        ok: true,
        source: 'api',
        deduplicated: Boolean(envelope?.meta?.deduplicated),
        savedLocally: true,
        match: envelope?.data,
      };
    } catch (err) {
      // Tetap simpan secara lokal agar statistik pemain tidak hilang, namun laporkan gagal sinkron ke API
      const localBackup = saveMatchLocally(payload);
      const message =
        err instanceof Error
          ? err.message
          : 'Gagal menyinkronkan skor ke server API.';
      return {
        ok: false,
        source: 'local',
        deduplicated: localBackup.deduplicated,
        savedLocally: true,
        match: localBackup.match,
        errorMessage: message,
      };
    } finally {
      inFlightSyncMap.delete(dedupeKey);
    }
  })();

  inFlightSyncMap.set(dedupeKey, task);
  return task;
}

export function clearLocalMatchCache(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(LOCAL_MATCHES_KEY);
  } catch {
    // abaikan
  }
}
