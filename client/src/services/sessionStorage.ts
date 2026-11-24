import type { StoredSession } from '../types/protocol';

const SESSION_KEY = 'ulta_session_v1';

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage;
    }
  } catch {
    return null;
  }
  return null;
}

export function loadStoredSession(): StoredSession | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (!parsed.playerId || !parsed.token) return null;
    return {
      playerId: parsed.playerId,
      token: parsed.token,
      playerName: parsed.playerName ?? '',
      ...(parsed.roomCode ? { roomCode: parsed.roomCode } : {}),
    };
  } catch {
    return null;
  }
}

export function saveStoredSession(session: StoredSession): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Abaikan error quota/private mode browser
  }
}

export function updateStoredSessionRoom(roomCode?: string): void {
  const current = loadStoredSession();
  if (!current) return;
  saveStoredSession({
    ...current,
    ...(roomCode ? { roomCode } : { roomCode: undefined }),
  });
}

export function clearStoredSession(): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(SESSION_KEY);
  } catch {
    // Abaikan error storage
  }
}
