import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MockGameTransport,
  doGridSegmentsIntersect,
  generateMockBoard,
  getMockQuestionBankSize,
} from '../src/services/mockTransport';
import { parseServerEvent } from '../src/services/protocolParser';
import {
  WebSocketTransport,
  type WebSocketLike,
} from '../src/services/wsTransport';
import {
  createInitialGameState,
  reduceServerEvent,
  type GameStoreState,
} from '../src/store/gameStore';
import type { ConnectionStatus, ServerEvent } from '../src/types/protocol';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

class FakeWebSocket implements WebSocketLike {
  public static instances: FakeWebSocket[] = [];
  public readyState = 0; // CONNECTING
  public sentMessages: string[] = [];
  public closed = false;
  public onopen: ((event: unknown) => void) | null = null;
  public onmessage: ((event: { data: unknown }) => void) | null = null;
  public onerror: ((event: unknown) => void) | null = null;
  public onclose: ((event: { code?: number; reason?: string }) => void) | null =
    null;

  constructor(public readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  public triggerOpen(): void {
    this.readyState = 1; // OPEN
    this.onopen?.({});
  }

  public triggerMessage(obj: Record<string, unknown>): void {
    this.onmessage?.({ data: JSON.stringify(obj) });
  }

  public send(data: string): void {
    this.sentMessages.push(data);
  }

  public close(): void {
    this.readyState = 3; // CLOSED
    this.closed = true;
    this.onclose?.({ code: 1000 });
  }
}

test('WebSocketTransport: flat JSON, auto HELLO onopen, seq increment, heartbeat PING & cleanup', async () => {
  FakeWebSocket.instances = [];
  const statuses: ConnectionStatus[] = [];
  const received: ServerEvent[] = [];

  const transport = new WebSocketTransport({
    WebSocketImpl: FakeWebSocket,
    autoReconnect: false,
  });

  transport.connect(
    {
      url: 'ws://example.test:8080',
      playerName: 'Syarif',
      heartbeatIntervalMs: 40,
    },
    {
      onStatusChange: (s) => statuses.push(s),
      onRawMessage: (raw) => {
        const parsed = parseServerEvent(raw);
        if (parsed) received.push(parsed);
      },
      onTransportError: () => {},
    },
  );

  assert.equal(statuses[0], 'connecting');
  assert.equal(FakeWebSocket.instances.length, 1);

  const ws = FakeWebSocket.instances[0];
  ws.triggerOpen();
  assert.equal(statuses[1], 'connected');

  // Pesan pertama wajib HELLO flat JSON dengan seq: 1 (tanpa wrapper "payload")
  assert.equal(ws.sentMessages.length, 1);
  const hello = JSON.parse(ws.sentMessages[0]) as Record<string, unknown>;
  assert.equal(hello.type, 'HELLO');
  assert.equal(hello.seq, 1);
  assert.equal(hello.name, 'Syarif');
  assert.equal('payload' in hello, false);

  // Kirim CREATE_ROOM -> seq: 2 flat JSON
  transport.send({ type: 'CREATE_ROOM', max_players: 4 });
  const createRoom = JSON.parse(ws.sentMessages[1]) as Record<string, unknown>;
  assert.equal(createRoom.type, 'CREATE_ROOM');
  assert.equal(createRoom.seq, 2);
  assert.equal(createRoom.max_players, 4);
  assert.equal('payload' in createRoom, false);

  // Tunggu heartbeat PING otomatis
  await sleep(95);
  const pings = ws.sentMessages
    .map((m) => JSON.parse(m) as Record<string, unknown>)
    .filter((m) => m.type === 'PING');
  assert.ok(pings.length >= 1, 'Heartbeat PING harus terkirim otomatis');
  assert.equal(pings[0].seq, 3);

  // Disconnect harus membersihkan interval PING sehingga tidak ada pesan baru lagi
  const countBeforeDisconnect = ws.sentMessages.length;
  transport.disconnect();
  assert.equal(transport.getStatus(), 'disconnected');
  assert.equal(ws.closed, true);

  await sleep(90);
  assert.equal(
    ws.sentMessages.length,
    countBeforeDisconnect,
    'Tidak boleh ada PING terkirim setelah disconnect (zero timer leak)',
  );
});

test('protocolParser: toleran terhadap variasi field server Python', () => {
  // ROOM_STATE dengan `code` dan `players` berbentuk dict/object
  const roomEvent = parseServerEvent(
    JSON.stringify({
      type: 'ROOM_STATE',
      code: '5c0315',
      host: 'p1',
      players: {
        p1: { name: 'Syarif', is_ready: true, is_online: true },
        p2: { name: 'Raka', ready: false, online: false },
      },
    }),
  );
  assert.ok(roomEvent && roomEvent.type === 'ROOM_STATE');
  assert.equal(roomEvent.roomCode, '5C0315');
  assert.equal(roomEvent.hostId, 'p1');
  assert.equal(roomEvent.players.length, 2);
  assert.equal(roomEvent.players[0].isHost, true);
  assert.equal(roomEvent.players[0].ready, true);
  assert.equal(roomEvent.players[1].online, false);
  assert.equal(roomEvent.players[1].status, 'offline');

  // QUESTION tanpa kunci jawaban (dan mengabaikan field answer jika pernah ada)
  const qEvent = parseServerEvent({
    type: 'QUESTION',
    q_id: 'q_01',
    player_id: 'p1',
    question: 'Apa port HTTPS?',
    options: ['22', '80', '443', '3306'],
    answer: 'C',
    deadline: 20,
  });
  assert.ok(qEvent && qEvent.type === 'QUESTION');
  assert.equal(qEvent.options.C, '443');
  assert.equal('answer' in qEvent, false);

  // ANSWER_RESULT mode penonton: field `correct` tidak ada -> tetap undefined
  const spectatorResult = parseServerEvent({
    type: 'ANSWER_RESULT',
    player_id: 'p2',
    bonus_dice: 3,
    to: 28,
  });
  assert.ok(spectatorResult && spectatorResult.type === 'ANSWER_RESULT');
  assert.equal(spectatorResult.correct, undefined);
  assert.equal(spectatorResult.bonusDice, 3);
  assert.equal(spectatorResult.to, 28);

  // Semua kode ERROR 400..500 menghasilkan pesan jelas
  const codes = [400, 401, 403, 404, 408, 409, 413, 429, 500];
  for (const code of codes) {
    const errEvent = parseServerEvent({ type: 'ERROR', code });
    assert.ok(errEvent && errEvent.type === 'ERROR');
    assert.equal(errEvent.code, code);
    assert.ok(errEvent.message.length > 5);
  }
});

test('reduceServerEvent: alur penuh game state, inferensi penonton, dan toast error', () => {
  let state: GameStoreState = createInitialGameState();
  const apply = (raw: Record<string, unknown>) => {
    const parsed = parseServerEvent(raw);
    assert.ok(parsed, `Event gagal diparse: ${JSON.stringify(raw)}`);
    state = { ...state, ...reduceServerEvent(state, parsed) };
  };

  apply({ type: 'WELCOME', seq: 1, player_id: 'p1', token: 'tok_abc', name: 'Syarif' });
  assert.equal(state.playerId, 'p1');
  assert.equal(state.token, 'tok_abc');

  apply({
    type: 'ROOM_STATE',
    room_code: 'AB12CD',
    host_id: 'p1',
    max_players: 2,
    players: [
      { player_id: 'p1', name: 'Syarif', ready: true, online: true },
      { player_id: 'p2', name: 'Nadia', ready: true, online: true },
    ],
  });
  assert.equal(state.phase, 'lobby');
  assert.equal(state.room?.roomCode, 'AB12CD');

  const board = generateMockBoard(createSeededRng(42));
  apply({
    type: 'GAME_START',
    board,
    order: ['p1', 'p2'],
  });
  assert.equal(state.phase, 'playing');
  assert.equal(state.boardSeed, null);
  assert.equal(state.board.length, 100);
  assert.equal(state.positions.p1, 1);
  assert.equal(state.positions.p2, 1);

  apply({ type: 'TURN', player_id: 'p2', deadline: 10 });
  assert.equal(state.currentTurn?.playerId, 'p2');

  apply({
    type: 'MOVE',
    player_id: 'p2',
    dice: 5,
    from: 1,
    path: [2, 3, 4, 5, 6],
    effect: 'QUESTION',
    to: 6,
  });
  assert.equal(state.positions.p2, 6);

  // Spectator melihat ANSWER_RESULT tanpa `correct`: posisi naik 6 -> 9 => inferredCorrect = true
  apply({
    type: 'ANSWER_RESULT',
    player_id: 'p2',
    bonus_dice: 3,
    to: 9,
  });
  assert.equal(state.positions.p2, 9);
  assert.equal(state.lastAnswerResult?.correct, undefined);
  assert.equal(state.lastAnswerResult?.inferredCorrect, true);
  assert.equal(state.quizStatsByPlayer.p2.correct, 1);

  // Offline status memunculkan toast warning
  apply({ type: 'PLAYER_STATUS', player_id: 'p2', status: 'offline' });
  assert.equal(state.room?.players[1].online, false);
  assert.ok(state.toasts.some((t) => t.severity === 'warning'));

  // Error 403 memunculkan toast error
  apply({ type: 'ERROR', seq: 9, code: 403, message: 'Bukan giliran Anda.' });
  assert.equal(state.lastError?.code, 403);
  assert.ok(state.toasts.some((t) => t.code === 403 && t.severity === 'error'));

  apply({
    type: 'GAME_OVER',
    winner: 'Syarif',
    winner_id: 'p1',
    ranking: [
      { rank: 1, player_id: 'p1', name: 'Syarif', position: 100, is_winner: true },
      { rank: 2, player_id: 'p2', name: 'Nadia', position: 9, is_winner: false },
    ],
  });
  assert.equal(state.phase, 'gameover');
  assert.equal(state.gameOver?.winnerName, 'Syarif');
});

test('generateMockBoard: 5 ular, 5 tangga, 15 soal merata, jarak grid >= 2, anti-crossing, & >= 25 bank soal', () => {
  assert.ok(
    getMockQuestionBankSize() >= 25,
    `Bank soal IT harus minimal 25 soal (ditemukan ${getMockQuestionBankSize()})`,
  );

  const toGrid = (tile: number) => {
    const row = Math.floor((tile - 1) / 10);
    const colInRow = (tile - 1) % 10;
    const col = row % 2 === 1 ? 9 - colInRow : colInRow;
    return { tile, row, col };
  };

  for (let seed = 101; seed <= 120; seed += 1) {
    const board = generateMockBoard(createSeededRng(seed));
    assert.equal(board.length, 100);
    assert.equal(board[0].type, 'NORMAL');
    assert.equal(board[99].type, 'NORMAL');

    const snakes = board.filter((c) => c.type === 'SNAKE');
    const ladders = board.filter((c) => c.type === 'LADDER');
    const questions = board.filter((c) => c.type === 'QUESTION');
    const normals = board.filter((c) => c.type === 'NORMAL');

    assert.equal(snakes.length, 5, `Seed ${seed}: harus tepat 5 ular`);
    assert.equal(ladders.length, 5, `Seed ${seed}: harus tepat 5 tangga`);
    assert.equal(questions.length, 15, `Seed ${seed}: harus tepat 15 soal`);
    assert.equal(normals.length, 75, `Seed ${seed}: harus tepat 75 normal`);

    const paths = [...snakes, ...ladders].map((c) => {
      assert.ok(typeof c.to === 'number');
      if (c.type === 'SNAKE') assert.ok(c.to < c.index);
      if (c.type === 'LADDER') assert.ok(c.to > c.index);
      return { from: toGrid(c.index), to: toGrid(c.to) };
    });

    // Panjang lompatan: 1–3 baris, maksimal 1 jalur 4 baris
    let longJumpCount = 0;
    for (const path of paths) {
      const deltaRow = Math.abs(path.to.row - path.from.row);
      assert.ok(
        deltaRow >= 1 && deltaRow <= 4,
        `Seed ${seed}: panjang baris ${deltaRow} di luar 1..4`,
      );
      if (deltaRow === 4) longJumpCount += 1;
    }
    assert.ok(
      longJumpCount <= 1,
      `Seed ${seed}: terlalu banyak jalur 4 baris (${longJumpCount})`,
    );

    // Jarak grid minimal 2 petak antar seluruh kepala/ekor/ujung
    const allEndpoints = paths.flatMap((p) => [p.from, p.to]);
    const endpointTileSet = new Set(allEndpoints.map((ep) => ep.tile));
    for (let i = 0; i < allEndpoints.length; i += 1) {
      for (let j = i + 1; j < allEndpoints.length; j += 1) {
        const dist = Math.max(
          Math.abs(allEndpoints[i].row - allEndpoints[j].row),
          Math.abs(allEndpoints[i].col - allEndpoints[j].col),
        );
        assert.ok(
          dist >= 2,
          `Seed ${seed}: endpoint ${allEndpoints[i].tile} dan ${allEndpoints[j].tile} terlalu dekat (dist=${dist})`,
        );
      }
    }

    // Anti-crossing: tidak ada garis ular/tangga yang saling bersilangan
    for (let i = 0; i < paths.length; i += 1) {
      for (let j = i + 1; j < paths.length; j += 1) {
        const crosses = doGridSegmentsIntersect(
          paths[i].from.tile,
          paths[i].to.tile,
          paths[j].from.tile,
          paths[j].to.tile,
        );
        assert.equal(
          crosses,
          false,
          `Seed ${seed}: jalur ${paths[i].from.tile}->${paths[i].to.tile} bersilangan dengan ${paths[j].from.tile}->${paths[j].to.tile}`,
        );
      }
    }

    // Sebaran 15 petak QUESTION: 1-2 di setiap rentang 10 petak, tidak tabrak endpoint, tidak bersebelahan
    const qTiles = questions.map((q) => q.index).sort((a, b) => a - b);
    const qPerDecade = new Array<number>(10).fill(0);
    for (let i = 0; i < qTiles.length; i += 1) {
      const tile = qTiles[i];
      assert.equal(
        endpointTileSet.has(tile),
        false,
        `Seed ${seed}: petak soal ${tile} bertabrakan dengan ujung ular/tangga`,
      );
      if (i > 0) {
        assert.ok(
          tile - qTiles[i - 1] >= 2,
          `Seed ${seed}: petak soal ${qTiles[i - 1]} dan ${tile} menumpuk bersebelahan`,
        );
      }
      qPerDecade[Math.floor((tile - 1) / 10)] += 1;
    }
    for (let band = 0; band < 10; band += 1) {
      assert.ok(
        qPerDecade[band] >= 1 && qPerDecade[band] <= 2,
        `Seed ${seed}: rentang petak ${band * 10 + 1}-${(band + 1) * 10} memiliki ${qPerDecade[band]} petak soal (harus 1-2)`,
      );
    }

    // Sebaran zona bawah (0..2), tengah (3..6), atas (7..9)
    const startRows = paths.map((p) => p.from.row);
    assert.ok(startRows.some((r) => r <= 2), 'Harus ada jalur di zona bawah');
    assert.ok(
      startRows.some((r) => r >= 3 && r <= 6),
      'Harus ada jalur di zona tengah',
    );
    assert.ok(startRows.some((r) => r >= 7), 'Harus ada jalur di zona atas');
  }
});

test('MockGameTransport: simulasi end-to-end ULTA/1.0 hingga GAME_OVER', async () => {
  let state: GameStoreState = createInitialGameState();
  let sawHumanQuestion = false;
  let sawBotSpectatorAnswerWithoutCorrect = false;
  let sawGameOver = false;

  const mock = new MockGameTransport({
    connectDelayMs: 5,
    botJoinDelayMs: 5,
    botTurnDelayMs: 5,
    botAnswerDelayMs: 5,
    postMoveDelayMs: 5,
    turnTimeoutMs: 500,
    questionTimeoutMs: 500,
    heartbeatIntervalMs: 1_000,
    rng: createSeededRng(777),
  });

  mock.connect(
    { url: 'mock://local', playerName: 'Tester' },
    {
      onStatusChange: (status) => {
        state = { ...state, connectionStatus: status };
      },
      onRawMessage: (rawJson) => {
        const event = parseServerEvent(rawJson);
        assert.ok(event, `Mock mengirim event tidak valid: ${rawJson}`);
        state = { ...state, ...reduceServerEvent(state, event) };

        if (event.type === 'QUESTION' && event.playerId === state.playerId) {
          sawHumanQuestion = true;
          mock.send({ type: 'ANSWER', q_id: event.qId, choice: 'B' });
        }

        if (
          event.type === 'ANSWER_RESULT' &&
          event.playerId !== state.playerId
        ) {
          assert.equal(
            event.correct,
            undefined,
            'ANSWER_RESULT bot (penonton) tidak boleh menyertakan field correct',
          );
          sawBotSpectatorAnswerWithoutCorrect = true;
        }

        if (event.type === 'TURN' && event.playerId === state.playerId) {
          mock.send({ type: 'ROLL' });
        }

        if (event.type === 'GAME_OVER') {
          sawGameOver = true;
        }
      },
      onTransportError: (msg) => {
        assert.fail(`Unexpected mock transport error: ${msg}`);
      },
    },
  );

  // Tunggu koneksi + WELCOME
  await sleep(25);
  assert.equal(state.connectionStatus, 'connected');
  assert.ok(state.playerId && state.token);

  // Buat room 2 pemain & tunggu bot bergabung
  mock.send({ type: 'CREATE_ROOM', max_players: 2 });
  await sleep(35);
  assert.equal(state.phase, 'lobby');
  assert.equal(state.room?.players.length, 2);

  // Host READY lalu START
  mock.send({ type: 'READY' });
  mock.send({ type: 'START' });

  // Tunggu permainan berjalan otomatis hingga GAME_OVER (maks 5 detik)
  const deadline = Date.now() + 5_000;
  while (!sawGameOver && Date.now() < deadline) {
    await sleep(25);
  }

  mock.disconnect();

  assert.equal(sawGameOver, true, 'Simulasi Mock Mode harus mencapai GAME_OVER');
  assert.equal(state.phase, 'gameover');
  assert.ok(state.gameOver && state.gameOver.ranking.length === 2);
  assert.ok(
    sawHumanQuestion || sawBotSpectatorAnswerWithoutCorrect || state.logs.length > 10,
    'Simulasi harus menghasilkan aktivitas permainan nyata',
  );
});

test('Kontrak asli server.py + game.py + board.py: 101-el board, active_player_id, effects beruntun, ANSWER_RESULT tanpa player_id, dan rankings', () => {
  let state: GameStoreState = createInitialGameState();
  const apply = (raw: Record<string, unknown>) => {
    const parsed = parseServerEvent(raw);
    assert.ok(parsed, `Event Python gagal diparse: ${JSON.stringify(raw)}`);
    state = { ...state, ...reduceServerEvent(state, parsed) };
    return parsed;
  };

  apply({ type: 'WELCOME', seq: 1, player_id: 'p_aaaa', token: 'tok_live' });
  assert.equal(state.playerId, 'p_aaaa');

  // ROOM_STATE asli game.py: code, state, phase, players dict dengan host: true, tanpa host_id/max_players
  apply({
    type: 'ROOM_STATE',
    code: '5C0315',
    state: 'LOBBY',
    phase: 'IDLE',
    players: {
      p_aaaa: { name: 'Syarif', pos: 1, ready: true, online: true, host: true },
      p_bbbb: { name: 'Budi', pos: 1, ready: true, online: true, host: false },
    },
  });
  assert.equal(state.phase, 'lobby');
  assert.equal(state.room?.roomCode, '5C0315');
  assert.equal(state.room?.hostId, 'p_aaaa');
  assert.equal(state.room?.players[0].isHost, true);

  // GAME_START asli board.py: array 101 elemen dengan board[0] === null
  const pythonBoard: Array<Record<string, unknown> | null> = [null];
  for (let i = 1; i <= 100; i += 1) {
    if (i === 6) pythonBoard.push({ kind: 'LADDER', to: 24 });
    else if (i === 24) pythonBoard.push({ kind: 'SNAKE', to: 11 });
    else if (i === 15) pythonBoard.push({ kind: 'QUESTION' });
    else if (i === 19) pythonBoard.push({ kind: 'SNAKE', to: 5 });
    else pythonBoard.push({ kind: 'NORMAL' });
  }
  assert.equal(pythonBoard.length, 101);

  apply({
    type: 'GAME_START',
    code: '5C0315',
    seed: 17,
    board: pythonBoard,
    turn_order: ['p_aaaa', 'p_bbbb'],
  });
  assert.equal(state.phase, 'playing');
  assert.equal(state.boardSeed, 17);
  assert.equal(state.board.length, 100);
  // Verifikasi indeks 1-based TIDAK bergeser oleh board[0] = null!
  assert.equal(state.board[0].index, 1);
  assert.equal(state.board[0].type, 'NORMAL');
  assert.equal(state.board[5].index, 6);
  assert.equal(state.board[5].type, 'LADDER');
  assert.equal(state.board[5].to, 24);
  assert.equal(state.board[14].index, 15);
  assert.equal(state.board[14].type, 'QUESTION');
  assert.equal(state.board[99].index, 100);
  assert.equal(state.board[99].type, 'NORMAL');

  // TURN asli game.py: active_player_id, turn_no, deadline_in
  apply({
    type: 'TURN',
    active_player_id: 'p_bbbb',
    turn_no: 1,
    deadline_in: 10,
  });
  assert.equal(state.currentTurn?.playerId, 'p_bbbb');
  assert.equal(state.currentTurn?.turnNo, 1);
  assert.equal(state.currentTurn?.deadline, 10);

  // MOVE asli game.py: effects beruntun (LADDER 6->24 lalu SNAKE 24->11)
  apply({
    type: 'MOVE',
    player_id: 'p_bbbb',
    dice: 5,
    from: 1,
    path: [2, 3, 4, 5, 6],
    effects: [
      { from: 6, kind: 'LADDER', to: 24 },
      { from: 24, kind: 'SNAKE', to: 11 },
    ],
    to: 11,
  });
  assert.equal(state.positions.p_bbbb, 11);
  assert.equal(state.lastMove?.effects.length, 2);
  assert.equal(state.lastMove?.effects[0].kind, 'LADDER');
  assert.equal(state.lastMove?.effects[1].kind, 'SNAKE');

  // QUESTION asli game.py: text, bonus_dice, deadline_in, turn_no (tanpa answer)
  apply({
    type: 'QUESTION',
    player_id: 'p_bbbb',
    turn_no: 2,
    q_id: 'q07',
    text: 'Port HTTPS?',
    options: { A: '22', B: '80', C: '443', D: '3306' },
    bonus_dice: 4,
    deadline_in: 20,
  });
  assert.equal(state.activeQuestion?.qId, 'q07');
  assert.equal(state.activeQuestion?.bonusDice, 4);
  assert.equal(state.activeQuestion?.deadline, 20);

  // ANSWER_RESULT asli game.py untuk penonton: TANPA player_id dan TANPA correct,
  // maju 15->19 (benar!) lalu kena ular 19->5 -> inferensi tetap BENAR berdasarkan path!
  apply({
    type: 'ANSWER_RESULT',
    bonus_dice: 4,
    from: 15,
    path: [16, 17, 18, 19],
    effects: [{ from: 19, kind: 'SNAKE', to: 5 }],
    to: 5,
  });
  assert.equal(state.lastAnswerResult?.playerId, 'p_bbbb');
  assert.equal(state.lastAnswerResult?.correct, undefined);
  assert.equal(state.lastAnswerResult?.inferredCorrect, true);
  assert.equal(state.positions.p_bbbb, 5);
  assert.equal(state.quizStatsByPlayer.p_bbbb.correct, 1);

  // GAME_OVER asli game.py: winner_id & rankings (plural) dengan final_position tanpa name
  apply({
    type: 'GAME_OVER',
    winner_id: 'p_aaaa',
    rankings: [
      { rank: 1, player_id: 'p_aaaa', final_position: 100 },
      { rank: 2, player_id: 'p_bbbb', final_position: 5 },
    ],
  });
  assert.equal(state.phase, 'gameover');
  assert.equal(state.gameOver?.winnerId, 'p_aaaa');
  assert.equal(state.gameOver?.winnerName, 'Syarif');
  assert.equal(state.gameOver?.ranking.length, 2);
  assert.equal(state.gameOver?.ranking[0].name, 'Syarif');
  assert.equal(state.gameOver?.ranking[0].position, 100);
  assert.equal(state.gameOver?.ranking[1].name, 'Budi');
  assert.equal(state.gameOver?.ranking[1].position, 5);
});
