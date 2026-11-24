import type {
  BoardCell,
  ClientMessage,
  ClientMessagePayload,
  ConnectionStatus,
  QuizChoice,
  TileEffect,
} from '../types/protocol';
import type {
  GameTransport,
  TransportCallbacks,
  TransportConnectOptions,
} from './transport';

interface MockQuestionRecord {
  id: string;
  category: string;
  prompt: string;
  options: Record<QuizChoice, string>;
  answer: QuizChoice;
}

interface MockPlayerState {
  player_id: string;
  name: string;
  ready: boolean;
  online: boolean;
  status: 'online' | 'offline' | 'left';
  isBot: boolean;
  position: number;
}

interface PendingMockQuestion {
  qId: string;
  playerId: string;
  answer: QuizChoice;
  positionAtLanding: number;
  hadDiceSix: boolean;
}

export interface MockTransportTimingConfig {
  connectDelayMs?: number;
  botJoinDelayMs?: number;
  botTurnDelayMs?: number;
  botAnswerDelayMs?: number;
  postMoveDelayMs?: number;
  turnTimeoutMs?: number;
  questionTimeoutMs?: number;
  heartbeatIntervalMs?: number;
  rng?: () => number;
}

const MOCK_QUESTIONS: MockQuestionRecord[] = [
  {
    id: 'q_01',
    category: 'Jaringan Komputer',
    prompt: 'Protokol transport yang menjamin pengiriman data secara berurutan dan andal adalah...',
    options: { A: 'UDP', B: 'TCP', C: 'ICMP', D: 'ARP' },
    answer: 'B',
  },
  {
    id: 'q_02',
    category: 'Protokol Web',
    prompt: 'Kode status HTTP yang menandakan permintaan ditolak karena tidak memiliki hak akses (Forbidden) adalah...',
    options: { A: '401', B: '403', C: '404', D: '409' },
    answer: 'B',
  },
  {
    id: 'q_03',
    category: 'Jaringan Komputer',
    prompt: 'Layer pada model OSI yang bertanggung jawab atas routing paket antar jaringan adalah...',
    options: { A: 'Data Link', B: 'Network', C: 'Session', D: 'Presentation' },
    answer: 'B',
  },
  {
    id: 'q_04',
    category: 'Pemrograman Jaringan',
    prompt: 'Pada protokol ULTA/1.0, ukuran header length-prefix Big-Endian untuk framing TCP adalah...',
    options: { A: '2 byte', B: '4 byte', C: '8 byte', D: '16 byte' },
    answer: 'B',
  },
  {
    id: 'q_05',
    category: 'Jaringan Komputer',
    prompt: 'Layanan yang menerjemahkan nama domain menjadi alamat IP disebut...',
    options: { A: 'DHCP', B: 'NAT', C: 'DNS', D: 'SMTP' },
    answer: 'C',
  },
  {
    id: 'q_06',
    category: 'Basis Data',
    prompt: 'Perintah SQL untuk menggabungkan baris dari dua tabel berdasarkan kolom yang cocok adalah...',
    options: { A: 'MERGE', B: 'JOIN', C: 'GROUP BY', D: 'HAVING' },
    answer: 'B',
  },
  {
    id: 'q_07',
    category: 'Keamanan Jaringan',
    prompt: 'Skema URL WebSocket yang menggunakan enkripsi TLS/SSL adalah...',
    options: { A: 'ws://', B: 'wss://', C: 'tcp://', D: 'ssh://' },
    answer: 'B',
  },
  {
    id: 'q_08',
    category: 'Jaringan Komputer',
    prompt: 'Port default untuk protokol HTTPS adalah...',
    options: { A: '22', B: '80', C: '443', D: '3306' },
    answer: 'C',
  },
  {
    id: 'q_09',
    category: 'Sistem Operasi',
    prompt: 'Mekanisme sinkronisasi agar dua thread tidak mengakses resource bersama secara bersamaan disebut...',
    options: { A: 'Mutex', B: 'Cache', C: 'Pipeline', D: 'Socket' },
    answer: 'A',
  },
  {
    id: 'q_10',
    category: 'Arsitektur Web',
    prompt: 'Metode HTTP yang bersifat idempoten untuk membaca data tanpa mengubah state server adalah...',
    options: { A: 'POST', B: 'GET', C: 'PATCH', D: 'CONNECT' },
    answer: 'B',
  },
  {
    id: 'q_11',
    category: 'Jaringan Komputer',
    prompt: 'Alamat IPv4 loopback standar yang merujuk ke mesin lokal adalah...',
    options: { A: '192.168.0.1', B: '10.0.0.1', C: '127.0.0.1', D: '255.255.255.0' },
    answer: 'C',
  },
  {
    id: 'q_12',
    category: 'Pemrograman Web',
    prompt: 'Format pertukaran data teks ringan berbasis key-value yang dipakai pada ULTA/1.0 adalah...',
    options: { A: 'XML', B: 'JSON', C: 'CSV', D: 'INI' },
    answer: 'B',
  },
];

const BOT_NAMES = ['Bot-Raka', 'Bot-Nadia', 'Bot-Dimas', 'Bot-Sinta'];

export function generateMockBoard(rng: () => number = Math.random): BoardCell[] {
  const cells: BoardCell[] = Array.from({ length: 100 }, (_, i) => ({
    index: i + 1,
    type: 'NORMAL' as TileEffect,
  }));

  const used = new Set<number>([1, 100]);

  const pickUnused = (min: number, max: number): number => {
    const candidates: number[] = [];
    for (let n = min; n <= max; n += 1) {
      if (!used.has(n)) candidates.push(n);
    }
    const idx = Math.floor(rng() * candidates.length);
    return candidates[idx];
  };

  // 8 Ular (SNAKE: to < n)
  for (let i = 0; i < 8; i += 1) {
    const head = pickUnused(22, 98);
    used.add(head);
    const minTail = Math.max(2, head - 35);
    const maxTail = Math.max(2, head - 8);
    const tail =
      minTail + Math.floor(rng() * Math.max(1, maxTail - minTail + 1));
    cells[head - 1] = { index: head, type: 'SNAKE', to: tail };
  }

  // 8 Tangga (LADDER: to > n)
  for (let i = 0; i < 8; i += 1) {
    const base = pickUnused(3, 78);
    used.add(base);
    const minTop = Math.min(99, base + 8);
    const maxTop = Math.min(99, base + 32);
    const top =
      minTop + Math.floor(rng() * Math.max(1, maxTop - minTop + 1));
    cells[base - 1] = { index: base, type: 'LADDER', to: top };
  }

  // 10 Petak Soal (QUESTION)
  for (let i = 0; i < 10; i += 1) {
    const tile = pickUnused(4, 96);
    used.add(tile);
    cells[tile - 1] = { index: tile, type: 'QUESTION' };
  }

  return cells;
}

/**
 * Adapter Mock Mode terisolasi untuk pengujian UI & protokol ULTA/1.0 saat VPS mati.
 * Memancarkan string JSON flat yang persis sama dengan server Python asli.
 */
export class MockGameTransport implements GameTransport {
  public readonly mode = 'mock' as const;

  private readonly timing: Required<Omit<MockTransportTimingConfig, 'rng'>>;
  private readonly rng: () => number;

  private status: ConnectionStatus = 'disconnected';
  private callbacks: TransportCallbacks | null = null;
  private seq = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private scheduledTimers = new Set<ReturnType<typeof setTimeout>>();

  private humanId = '';
  private humanName = 'Pemain';
  private token = '';
  private roomCode = '';
  private hostId = '';
  private maxPlayers = 4;
  private roomStatus: 'WAITING' | 'PLAYING' | 'FINISHED' = 'WAITING';
  private players: MockPlayerState[] = [];
  private board: BoardCell[] = [];
  private turnOrder: string[] = [];
  private turnIndex = 0;
  private pendingQuestion: PendingMockQuestion | null = null;
  private turnDeadlineTimer: ReturnType<typeof setTimeout> | null = null;
  private questionDeadlineTimer: ReturnType<typeof setTimeout> | null = null;
  private questionCursor = 0;

  constructor(config: MockTransportTimingConfig = {}) {
    this.timing = {
      connectDelayMs: config.connectDelayMs ?? 180,
      botJoinDelayMs: config.botJoinDelayMs ?? 450,
      botTurnDelayMs: config.botTurnDelayMs ?? 900,
      botAnswerDelayMs: config.botAnswerDelayMs ?? 1_400,
      postMoveDelayMs: config.postMoveDelayMs ?? 250,
      turnTimeoutMs: config.turnTimeoutMs ?? 10_000,
      questionTimeoutMs: config.questionTimeoutMs ?? 20_000,
      heartbeatIntervalMs: config.heartbeatIntervalMs ?? 7_000,
    };
    this.rng = config.rng ?? Math.random;
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public connect(
    options: TransportConnectOptions,
    callbacks: TransportCallbacks,
  ): void {
    this.clearAllTimers();
    this.callbacks = callbacks;
    this.seq = 0;
    this.humanName = options.playerName.trim() || 'Pemain';
    this.setStatus('connecting');

    this.schedule(() => {
      this.setStatus('connected');

      // Jalankan handshake otomatis persis seperti WebSocketTransport
      if (options.useReconnect && options.token) {
        this.send({ type: 'RECONNECT', token: options.token });
      } else {
        this.send({ type: 'HELLO', name: this.humanName });
      }

      const hbMs = options.heartbeatIntervalMs ?? this.timing.heartbeatIntervalMs;
      this.heartbeatTimer = setInterval(() => {
        this.send({ type: 'PING' });
      }, hbMs);
    }, this.timing.connectDelayMs);
  }

  public send(payload: ClientMessagePayload): ClientMessage | null {
    if (this.status !== 'connected') return null;

    this.seq += 1;
    const message: ClientMessage = {
      ...payload,
      seq: this.seq,
    };

    this.handleClientMessage(message);
    return message;
  }

  public disconnect(): void {
    this.clearAllTimers();
    this.pendingQuestion = null;
    this.setStatus('disconnected');
  }

  private handleClientMessage(msg: ClientMessage): void {
    switch (msg.type) {
      case 'HELLO': {
        this.humanName = msg.name.trim() || 'Pemain';
        this.humanId = `mock_${this.randomHex(6)}`;
        this.token = `tok_${this.randomHex(16)}`;
        this.emit({
          type: 'WELCOME',
          seq: msg.seq,
          player_id: this.humanId,
          token: this.token,
          name: this.humanName,
        });
        break;
      }

      case 'RECONNECT': {
        if (!msg.token) {
          this.emitError(401, 'Token reconnect tidak valid.', msg.seq);
          return;
        }
        this.humanId = this.humanId || `mock_${this.randomHex(6)}`;
        this.token = msg.token;
        this.emit({
          type: 'WELCOME',
          seq: msg.seq,
          player_id: this.humanId,
          token: this.token,
          name: this.humanName,
        });
        if (this.roomCode && this.players.length > 0) {
          this.emitRoomState();
        }
        break;
      }

      case 'PING': {
        this.emit({
          type: 'PONG',
          seq: msg.seq,
          ts: Date.now(),
        });
        break;
      }

      case 'CREATE_ROOM': {
        if (msg.max_players < 2 || msg.max_players > 5) {
          this.emitError(400, 'Jumlah pemain harus antara 2 sampai 5.', msg.seq);
          return;
        }
        this.resetRoom();
        this.maxPlayers = msg.max_players;
        this.roomCode = this.randomRoomCode();
        this.hostId = this.humanId;
        this.roomStatus = 'WAITING';
        this.players = [
          {
            player_id: this.humanId,
            name: this.humanName,
            ready: false,
            online: true,
            status: 'online',
            isBot: false,
            position: 1,
          },
        ];
        this.emitRoomState();

        // Tambahkan bot agar pengguna dapat langsung menguji permainan
        const botCount = Math.min(2, this.maxPlayers - 1);
        for (let i = 0; i < botCount; i += 1) {
          const botIndex = i;
          this.schedule(() => {
            if (this.roomStatus !== 'WAITING' || !this.roomCode) return;
            const botId = `bot_${botIndex + 1}`;
            if (this.players.some((p) => p.player_id === botId)) return;
            this.players.push({
              player_id: botId,
              name: BOT_NAMES[botIndex % BOT_NAMES.length],
              ready: true,
              online: true,
              status: 'online',
              isBot: true,
              position: 1,
            });
            this.emitRoomState();
          }, this.timing.botJoinDelayMs * (botIndex + 1));
        }
        break;
      }

      case 'JOIN_ROOM': {
        const code = msg.room_code.trim().toUpperCase();
        if (!/^[A-Z0-9]{6}$/.test(code)) {
          this.emitError(400, 'Kode room harus 6 karakter alfanumerik.', msg.seq);
          return;
        }
        this.resetRoom();
        this.roomCode = code;
        this.maxPlayers = 4;
        this.roomStatus = 'WAITING';
        const hostBotId = 'bot_host';
        this.hostId = hostBotId;
        this.players = [
          {
            player_id: hostBotId,
            name: BOT_NAMES[0],
            ready: true,
            online: true,
            status: 'online',
            isBot: true,
            position: 1,
          },
          {
            player_id: this.humanId,
            name: this.humanName,
            ready: false,
            online: true,
            status: 'online',
            isBot: false,
            position: 1,
          },
        ];
        this.emitRoomState();
        break;
      }

      case 'READY': {
        if (!this.roomCode) {
          this.emitError(404, 'Anda belum berada di dalam room.', msg.seq);
          return;
        }
        const player = this.players.find((p) => p.player_id === this.humanId);
        if (!player) return;
        player.ready = !player.ready;
        this.emitRoomState();

        // Jika host adalah bot dan semua pemain siap, bot memulai game otomatis
        if (
          this.roomStatus === 'WAITING' &&
          this.hostId !== this.humanId &&
          this.players.length >= 2 &&
          this.players.every((p) => p.ready)
        ) {
          this.schedule(() => {
            if (
              this.roomStatus === 'WAITING' &&
              this.players.every((p) => p.ready)
            ) {
              this.startMockGame();
            }
          }, this.timing.botJoinDelayMs);
        }
        break;
      }

      case 'START': {
        if (!this.roomCode) {
          this.emitError(404, 'Room tidak ditemukan.', msg.seq);
          return;
        }
        if (this.hostId !== this.humanId) {
          this.emitError(403, 'Hanya host yang dapat memulai permainan.', msg.seq);
          return;
        }
        if (this.players.length < 2) {
          this.emitError(409, 'Minimal 2 pemain diperlukan untuk memulai.', msg.seq);
          return;
        }
        if (!this.players.every((p) => p.ready)) {
          this.emitError(409, 'Semua pemain harus berstatus SIAP sebelum mulai.', msg.seq);
          return;
        }
        this.startMockGame();
        break;
      }

      case 'ROLL': {
        if (this.roomStatus !== 'PLAYING') {
          this.emitError(409, 'Permainan belum dimulai.', msg.seq);
          return;
        }
        if (this.pendingQuestion) {
          this.emitError(409, 'Selesaikan soal kuis terlebih dahulu.', msg.seq);
          return;
        }
        const activeId = this.turnOrder[this.turnIndex];
        if (activeId !== this.humanId) {
          this.emitError(403, 'Belum giliran Anda untuk melempar dadu.', msg.seq);
          return;
        }
        this.executeRoll(this.humanId);
        break;
      }

      case 'ANSWER': {
        if (!this.pendingQuestion) {
          this.emitError(409, 'Tidak ada soal aktif saat ini.', msg.seq);
          return;
        }
        if (this.pendingQuestion.playerId !== this.humanId) {
          this.emitError(403, 'Bukan giliran Anda menjawab soal ini.', msg.seq);
          return;
        }
        if (this.pendingQuestion.qId !== msg.q_id) {
          this.emitError(400, 'ID soal tidak cocok dengan soal aktif.', msg.seq);
          return;
        }
        this.resolveQuestion(msg.choice, false);
        break;
      }

      case 'LEAVE': {
        if (!this.roomCode) return;
        this.clearTurnTimers();
        this.emit({
          type: 'PLAYER_STATUS',
          player_id: this.humanId,
          status: 'left',
          name: this.humanName,
        });
        this.resetRoom();
        break;
      }
    }
  }

  private startMockGame(): void {
    this.roomStatus = 'PLAYING';
    this.board = generateMockBoard(this.rng);
    this.turnOrder = this.players.map((p) => p.player_id);
    this.turnIndex = 0;
    this.pendingQuestion = null;

    for (const p of this.players) {
      p.position = 1;
    }

    this.emit({
      type: 'GAME_START',
      room_code: this.roomCode,
      board: this.board,
      order: this.turnOrder,
      players: this.players.map((p) => ({
        player_id: p.player_id,
        name: p.name,
        ready: p.ready,
        online: p.online,
        status: p.status,
        position: p.position,
      })),
    });

    this.beginCurrentTurn();
  }

  private beginCurrentTurn(): void {
    if (this.roomStatus !== 'PLAYING' || this.turnOrder.length === 0) return;

    this.clearTurnTimers();
    const activeId = this.turnOrder[this.turnIndex];
    const activePlayer = this.players.find((p) => p.player_id === activeId);
    if (!activePlayer || !activePlayer.online) {
      this.advanceTurn();
      return;
    }

    const deadlineSec = Math.max(1, Math.round(this.timing.turnTimeoutMs / 1000));
    this.emit({
      type: 'TURN',
      player_id: activeId,
      deadline: deadlineSec,
    });

    if (activePlayer.isBot) {
      this.schedule(() => {
        if (
          this.roomStatus === 'PLAYING' &&
          this.turnOrder[this.turnIndex] === activeId &&
          !this.pendingQuestion
        ) {
          this.executeRoll(activeId);
        }
      }, this.timing.botTurnDelayMs);
    } else {
      // Auto-roll jika waktu 10 detik habis (sesuai BLUEPRINT.md)
      this.turnDeadlineTimer = setTimeout(() => {
        if (
          this.roomStatus === 'PLAYING' &&
          this.turnOrder[this.turnIndex] === activeId &&
          !this.pendingQuestion
        ) {
          this.executeRoll(activeId);
        }
      }, this.timing.turnTimeoutMs);
    }
  }

  private executeRoll(playerId: string): void {
    this.clearTurnTimers();
    const player = this.players.find((p) => p.player_id === playerId);
    if (!player) return;

    const dice = 1 + Math.floor(this.rng() * 6);
    const from = player.position;
    const rawTarget = Math.min(100, from + dice);

    const path: number[] = [];
    for (let step = from + 1; step <= rawTarget; step += 1) {
      path.push(step);
    }
    if (path.length === 0) {
      path.push(rawTarget);
    }

    const landedCell = this.board[rawTarget - 1] ?? {
      index: rawTarget,
      type: 'NORMAL' as TileEffect,
    };

    let finalTo = rawTarget;
    if (
      (landedCell.type === 'SNAKE' || landedCell.type === 'LADDER') &&
      typeof landedCell.to === 'number'
    ) {
      finalTo = landedCell.to;
    }

    player.position = finalTo;

    this.emit({
      type: 'MOVE',
      player_id: playerId,
      dice,
      from,
      path,
      effect: landedCell.type,
      to: finalTo,
    });

    if (finalTo >= 100) {
      this.finishGame(player);
      return;
    }

    if (landedCell.type === 'QUESTION') {
      this.triggerQuestion(player, dice === 6);
      return;
    }

    // Dadu 6 mendapatkan giliran tambahan
    if (dice === 6) {
      this.schedule(() => this.beginCurrentTurn(), this.timing.postMoveDelayMs);
    } else {
      this.schedule(() => this.advanceTurn(), this.timing.postMoveDelayMs);
    }
  }

  private triggerQuestion(player: MockPlayerState, hadDiceSix: boolean): void {
    const q = MOCK_QUESTIONS[this.questionCursor % MOCK_QUESTIONS.length];
    this.questionCursor += 1;

    this.pendingQuestion = {
      qId: q.id,
      playerId: player.player_id,
      answer: q.answer,
      positionAtLanding: player.position,
      hadDiceSix,
    };

    const deadlineSec = Math.max(
      1,
      Math.round(this.timing.questionTimeoutMs / 1000),
    );

    // Broadcast QUESTION tanpa kunci jawaban ke semua pemain
    this.emit({
      type: 'QUESTION',
      q_id: q.id,
      player_id: player.player_id,
      category: q.category,
      question: q.prompt,
      options: q.options,
      deadline: deadlineSec,
    });

    if (player.isBot) {
      this.schedule(() => {
        if (!this.pendingQuestion || this.pendingQuestion.playerId !== player.player_id) {
          return;
        }
        const botGetsItRight = this.rng() < 0.65;
        const choices: QuizChoice[] = ['A', 'B', 'C', 'D'];
        const chosen = botGetsItRight
          ? q.answer
          : choices.find((c) => c !== q.answer) ?? 'A';
        this.resolveQuestion(chosen, false);
      }, this.timing.botAnswerDelayMs);
    } else {
      this.questionDeadlineTimer = setTimeout(() => {
        if (this.pendingQuestion?.playerId === player.player_id) {
          this.resolveQuestion(null, true);
        }
      }, this.timing.questionTimeoutMs);
    }
  }

  private resolveQuestion(choice: QuizChoice | null, timedOut: boolean): void {
    if (!this.pendingQuestion) return;

    this.clearTurnTimers();
    const pending = this.pendingQuestion;
    this.pendingQuestion = null;

    const player = this.players.find((p) => p.player_id === pending.playerId);
    if (!player) return;

    const isCorrect = !timedOut && choice === pending.answer;
    const bonusDice = 1 + Math.floor(this.rng() * 3);
    const from = pending.positionAtLanding;
    const to = isCorrect
      ? Math.min(100, from + bonusDice)
      : Math.max(1, from - bonusDice);

    player.position = to;

    // Sesuai BLUEPRINT.md:
    // field `correct` HANYA dikirim kepada pemain yang menjawab;
    // pemain lain (penonton) sengaja tidak menerima field `correct`.
    const payload: Record<string, unknown> = {
      type: 'ANSWER_RESULT',
      q_id: pending.qId,
      player_id: player.player_id,
      bonus_dice: bonusDice,
      from,
      to,
    };

    if (player.player_id === this.humanId) {
      payload.correct = isCorrect;
    }

    this.emit(payload);

    if (to >= 100) {
      this.finishGame(player);
      return;
    }

    if (pending.hadDiceSix) {
      this.schedule(() => this.beginCurrentTurn(), this.timing.postMoveDelayMs);
    } else {
      this.schedule(() => this.advanceTurn(), this.timing.postMoveDelayMs);
    }
  }

  private advanceTurn(): void {
    if (this.roomStatus !== 'PLAYING' || this.turnOrder.length === 0) return;
    this.turnIndex = (this.turnIndex + 1) % this.turnOrder.length;
    this.beginCurrentTurn();
  }

  private finishGame(winner: MockPlayerState): void {
    this.clearTurnTimers();
    this.roomStatus = 'FINISHED';

    const sorted = [...this.players].sort((a, b) => {
      if (a.player_id === winner.player_id) return -1;
      if (b.player_id === winner.player_id) return 1;
      return b.position - a.position;
    });

    this.emit({
      type: 'GAME_OVER',
      winner_id: winner.player_id,
      winner: winner.name,
      ranking: sorted.map((p, idx) => ({
        rank: idx + 1,
        player_id: p.player_id,
        name: p.name,
        position: p.position,
        is_winner: p.player_id === winner.player_id,
      })),
    });
  }

  private emitRoomState(): void {
    this.emit({
      type: 'ROOM_STATE',
      room_code: this.roomCode,
      host_id: this.hostId,
      max_players: this.maxPlayers,
      status: this.roomStatus,
      players: this.players.map((p) => ({
        player_id: p.player_id,
        name: p.name,
        ready: p.ready,
        online: p.online,
        status: p.status,
        position: p.position,
      })),
    });
  }

  private emitError(code: number, message: string, seq?: number): void {
    this.emit({
      type: 'ERROR',
      ...(seq !== undefined ? { seq } : {}),
      code,
      message,
    });
  }

  private emit(obj: Record<string, unknown>): void {
    if (this.status !== 'connected') return;
    this.callbacks?.onRawMessage(JSON.stringify(obj));
  }

  private resetRoom(): void {
    this.clearTurnTimers();
    this.roomCode = '';
    this.hostId = '';
    this.roomStatus = 'WAITING';
    this.players = [];
    this.board = [];
    this.turnOrder = [];
    this.turnIndex = 0;
    this.pendingQuestion = null;
  }

  private schedule(fn: () => void, delayMs: number): void {
    const timer = setTimeout(() => {
      this.scheduledTimers.delete(timer);
      fn();
    }, delayMs);
    this.scheduledTimers.add(timer);
  }

  private clearTurnTimers(): void {
    if (this.turnDeadlineTimer !== null) {
      clearTimeout(this.turnDeadlineTimer);
      this.turnDeadlineTimer = null;
    }
    if (this.questionDeadlineTimer !== null) {
      clearTimeout(this.questionDeadlineTimer);
      this.questionDeadlineTimer = null;
    }
  }

  private clearAllTimers(): void {
    this.clearTurnTimers();
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    for (const timer of this.scheduledTimers) {
      clearTimeout(timer);
    }
    this.scheduledTimers.clear();
  }

  private setStatus(next: ConnectionStatus): void {
    if (this.status === next) return;
    this.status = next;
    this.callbacks?.onStatusChange(next);
  }

  private randomHex(length: number): string {
    const chars = '0123456789abcdef';
    let out = '';
    for (let i = 0; i < length; i += 1) {
      out += chars[Math.floor(this.rng() * chars.length)];
    }
    return out;
  }

  private randomRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 6; i += 1) {
      out += chars[Math.floor(this.rng() * chars.length)];
    }
    return out;
  }
}
