import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLocalLeaderboard,
  clearLocalMatchCache,
  loadLocalMatches,
  saveMatchLocally,
} from '../src/services/apiClient';
import { buildMatchSummaryPayload } from '../src/pages/GameOverPage';

function installMemoryLocalStorage() {
  const store = new Map<string, string>();
  const mockStorage: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? (store.get(key) ?? null) : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };

  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: mockStorage },
    configurable: true,
    writable: true,
  });
}

test('buildMatchSummaryPayload menghasilkan matchKey deterministik berbasis boardSeed lintas client', () => {
  const payloadA = buildMatchSummaryPayload({
    gameOver: {
      type: 'GAME_OVER',
      winnerId: 'p1',
      winnerName: 'Syarif',
      ranking: [
        { rank: 1, playerId: 'p1', name: 'Syarif', position: 100, isWinner: true },
        { rank: 2, playerId: 'p2', name: 'Budi', position: 74, isWinner: false },
      ],
    },
    room: {
      roomCode: '5C0315',
      hostId: 'p1',
      maxPlayers: 2,
      status: 'FINISHED',
      players: [],
    },
    boardSeed: 4242,
    startedAt: '2026-11-28T10:00:00.000Z',
    quizStatsByPlayer: {
      p1: { answered: 4, correct: 3 },
      p2: { answered: 2, correct: 1 },
    },
    finishedAtOverride: '2026-11-28T10:05:00.000Z',
  });

  const payloadB = buildMatchSummaryPayload({
    gameOver: {
      type: 'GAME_OVER',
      winnerId: 'p1',
      winnerName: 'Syarif',
      ranking: [
        { rank: 1, playerId: 'p1', name: 'Syarif', position: 100, isWinner: true },
        { rank: 2, playerId: 'p2', name: 'Budi', position: 74, isWinner: false },
      ],
    },
    room: {
      roomCode: '5C0315',
      hostId: 'p1',
      maxPlayers: 2,
      status: 'FINISHED',
      players: [],
    },
    boardSeed: 4242,
    startedAt: '2026-11-28T10:00:05.000Z', // beda jam 5 detik di client lain
    quizStatsByPlayer: {
      p1: { answered: 4, correct: 3 },
      p2: { answered: 2, correct: 1 },
    },
    finishedAtOverride: '2026-11-28T10:05:07.000Z',
  });

  assert.equal(payloadA.matchKey, '5C0315-seed-4242');
  assert.equal(payloadA.matchKey, payloadB.matchKey);
  assert.equal(payloadA.participants[0].questionsCorrect, 3);
  assert.equal(payloadA.participants[0].questionsAnswered, 4);
});

test('saveMatchLocally anti-duplikasi & buildLocalLeaderboard menghitung winRate, quizAccuracy, averagePosition', () => {
  installMemoryLocalStorage();
  clearLocalMatchCache();

  const match1 = saveMatchLocally({
    matchKey: 'RM1001-seed-11',
    roomCode: 'RM1001',
    winnerName: 'Syarif',
    finishedAt: '2026-11-28T10:05:00.000Z',
    participants: [
      {
        playerName: 'Syarif',
        rank: 1,
        finalPosition: 100,
        isWinner: true,
        questionsAnswered: 4,
        questionsCorrect: 3,
      },
      {
        playerName: 'Budi',
        rank: 2,
        finalPosition: 60,
        isWinner: false,
        questionsAnswered: 2,
        questionsCorrect: 1,
      },
    ],
  });
  assert.equal(match1.deduplicated, false);

  // Kirim ulang dengan matchKey sama -> wajib dideduplikasi
  const dupByKey = saveMatchLocally({
    matchKey: 'RM1001-seed-11',
    roomCode: 'RM1001',
    winnerName: 'Syarif',
    finishedAt: '2026-11-28T10:05:03.000Z',
    participants: [
      { playerName: 'Syarif', rank: 1, finalPosition: 100, isWinner: true },
      { playerName: 'Budi', rank: 2, finalPosition: 60, isWinner: false },
    ],
  });
  assert.equal(dupByKey.deduplicated, true);

  // Kirim ulang tanpa matchKey tapi roomCode + winner sama dalam 2 menit -> wajib dideduplikasi
  const dupByWindow = saveMatchLocally({
    roomCode: 'RM1001',
    winnerName: 'Syarif',
    finishedAt: '2026-11-28T10:05:30.000Z',
    participants: [
      { playerName: 'Syarif', rank: 1, finalPosition: 100, isWinner: true },
      { playerName: 'Budi', rank: 2, finalPosition: 60, isWinner: false },
    ],
  });
  assert.equal(dupByWindow.deduplicated, true);

  // Match ke-2 (berbeda room) -> tersimpan
  const match2 = saveMatchLocally({
    matchKey: 'RM2002-seed-99',
    roomCode: 'RM2002',
    winnerName: 'Budi',
    finishedAt: '2026-11-28T11:00:00.000Z',
    participants: [
      {
        playerName: 'Budi',
        rank: 1,
        finalPosition: 100,
        isWinner: true,
        questionsAnswered: 2,
        questionsCorrect: 2,
      },
      {
        playerName: 'Syarif',
        rank: 2,
        finalPosition: 80,
        isWinner: false,
        questionsAnswered: 1,
        questionsCorrect: 1,
      },
    ],
  });
  assert.equal(match2.deduplicated, false);

  const matches = loadLocalMatches();
  assert.equal(matches.length, 2);

  const leaderboard = buildLocalLeaderboard(matches);
  assert.equal(leaderboard.length, 2);

  const syarif = leaderboard.find((e) => e.playerName === 'Syarif');
  const budi = leaderboard.find((e) => e.playerName === 'Budi');
  assert.ok(syarif && budi);

  assert.equal(syarif.gamesPlayed, 2);
  assert.equal(syarif.gamesWon, 1);
  assert.equal(syarif.winRate, 50);
  assert.equal(syarif.quizAccuracy, 80); // 4/5
  assert.equal(syarif.averagePosition, 90); // (100 + 80) / 2

  assert.equal(budi.gamesPlayed, 2);
  assert.equal(budi.gamesWon, 1);
  assert.equal(budi.winRate, 50);
  assert.equal(budi.quizAccuracy, 75); // 3/4
  assert.equal(budi.averagePosition, 80); // (60 + 100) / 2

  // Filter pencarian nama
  const filtered = buildLocalLeaderboard(matches, 'budi');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].playerName, 'Budi');
});
