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

interface GridPoint {
  tile: number;
  row: number;
  col: number;
}

function tileToGridPoint(tile: number): GridPoint {
  const row = Math.floor((tile - 1) / 10);
  const colInRow = (tile - 1) % 10;
  const col = row % 2 === 1 ? 9 - colInRow : colInRow;
  return { tile, row, col };
}

function chebyshevDistance(a: GridPoint, b: GridPoint): number {
  return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));
}

function cross2d(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): number {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

function onSegment(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  px: number,
  py: number,
): boolean {
  return (
    px >= Math.min(ax, bx) - 1e-6 &&
    px <= Math.max(ax, bx) + 1e-6 &&
    py >= Math.min(ay, by) - 1e-6 &&
    py <= Math.max(ay, by) + 1e-6
  );
}

export function doGridSegmentsIntersect(
  aTile: number,
  bTile: number,
  cTile: number,
  dTile: number,
): boolean {
  const a = tileToGridPoint(aTile);
  const b = tileToGridPoint(bTile);
  const c = tileToGridPoint(cTile);
  const d = tileToGridPoint(dTile);

  const d1 = cross2d(a.col, a.row, b.col, b.row, c.col, c.row);
  const d2 = cross2d(a.col, a.row, b.col, b.row, d.col, d.row);
  const d3 = cross2d(c.col, c.row, d.col, d.row, a.col, a.row);
  const d4 = cross2d(c.col, c.row, d.col, d.row, b.col, b.row);

  if (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  ) {
    return true;
  }

  if (Math.abs(d1) < 1e-6 && onSegment(a.col, a.row, b.col, b.row, c.col, c.row)) {
    return true;
  }
  if (Math.abs(d2) < 1e-6 && onSegment(a.col, a.row, b.col, b.row, d.col, d.row)) {
    return true;
  }
  if (Math.abs(d3) < 1e-6 && onSegment(c.col, c.row, d.col, d.row, a.col, a.row)) {
    return true;
  }
  if (Math.abs(d4) < 1e-6 && onSegment(c.col, c.row, d.col, d.row, b.col, b.row)) {
    return true;
  }

  return false;
}

function pointToSegmentDistance(
  p: GridPoint,
  a: GridPoint,
  b: GridPoint,
): number {
  const dx = b.col - a.col;
  const dy = b.row - a.row;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.col - a.col, p.row - a.row);
  const t = Math.max(
    0,
    Math.min(1, ((p.col - a.col) * dx + (p.row - a.row) * dy) / lenSq),
  );
  const projX = a.col + t * dx;
  const projY = a.row + t * dy;
  return Math.hypot(p.col - projX, p.row - projY);
}

interface PlacedPath {
  type: 'LADDER' | 'SNAKE';
  from: GridPoint;
  to: GridPoint;
}

function shuffleWithRng<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Fallback terjamin sah (5 tangga, 5 ular, 6 soal, Chebyshev >= 2, anti-crossing)
const FALLBACK_LADDERS: Array<[number, number]> = [
  [2, 22],
  [15, 35],
  [33, 53],
  [57, 84],
  [70, 90],
];

const FALLBACK_SNAKES: Array<[number, number]> = [
  [37, 17],
  [50, 30],
  [82, 62],
  [95, 66],
  [93, 73],
];

const FALLBACK_QUESTIONS: number[] = [7, 25, 45, 65, 78, 98];

/**
 * Generator papan Mock Mode yang lega dan terdistribusi rapi:
 * - 5 Tangga (LADDER), 5 Ular (SNAKE), 6 Petak Soal (QUESTION), 84 Normal (petak 1 & 100 selalu NORMAL).
 * - Tersebar merata di zona bawah, tengah, dan atas.
 * - Jarak grid minimal 2 petak (Chebyshev >= 2) antar seluruh kepala/ekor/ujung.
 * - Panjang lompatan wajar (1–3 baris, maksimal 1 jalur panjang 4 baris).
 * - Filter anti-crossing agar garis ular/tangga tidak saling bersilangan.
 */
export function generateMockBoard(rng: () => number = Math.random): BoardCell[] {
  const allPoints: GridPoint[] = Array.from({ length: 100 }, (_, i) =>
    tileToGridPoint(i + 1),
  ).filter((p) => p.tile !== 1 && p.tile !== 100);

  // Rencana zona seimbang: 5 tangga + 5 ular tersebar di bawah, tengah, atas
  const specs: Array<{
    type: 'LADDER' | 'SNAKE';
    minStartRow: number;
    maxStartRow: number;
  }> = [
    { type: 'LADDER', minStartRow: 0, maxStartRow: 2 },
    { type: 'LADDER', minStartRow: 1, maxStartRow: 3 },
    { type: 'LADDER', minStartRow: 3, maxStartRow: 5 },
    { type: 'LADDER', minStartRow: 4, maxStartRow: 6 },
    { type: 'LADDER', minStartRow: 6, maxStartRow: 7 },
    { type: 'SNAKE', minStartRow: 8, maxStartRow: 9 },
    { type: 'SNAKE', minStartRow: 7, maxStartRow: 8 },
    { type: 'SNAKE', minStartRow: 5, maxStartRow: 7 },
    { type: 'SNAKE', minStartRow: 3, maxStartRow: 5 },
    { type: 'SNAKE', minStartRow: 2, maxStartRow: 4 },
  ];

  const tryGenerate = (): {
    paths: PlacedPath[];
    questions: number[];
  } | null => {
    const placed: PlacedPath[] = [];
    const endpoints: GridPoint[] = [];
    let longJumpCount = 0;

    for (const spec of specs) {
      const startCandidates = shuffleWithRng(
        allPoints.filter(
          (p) =>
            p.row >= spec.minStartRow &&
            p.row <= spec.maxStartRow &&
            endpoints.every((ep) => chebyshevDistance(p, ep) >= 2),
        ),
        rng,
      );

      let chosen: PlacedPath | null = null;

      for (const start of startCandidates) {
        const maxDeltaRow = longJumpCount < 1 ? 4 : 3;
        const endCandidates = shuffleWithRng(
          allPoints.filter((end) => {
            if (spec.type === 'LADDER') {
              if (end.tile <= start.tile) return false;
              const dr = end.row - start.row;
              if (dr < 1 || dr > maxDeltaRow) return false;
            } else {
              if (end.tile >= start.tile) return false;
              const dr = start.row - end.row;
              if (dr < 1 || dr > maxDeltaRow) return false;
            }

            if (Math.abs(end.col - start.col) > 4) return false;
            if (chebyshevDistance(start, end) < 2) return false;
            if (endpoints.some((ep) => chebyshevDistance(end, ep) < 2)) {
              return false;
            }

            // Anti-crossing & jarak bersih dari endpoint jalur lain
            for (const existing of placed) {
              if (
                doGridSegmentsIntersect(
                  start.tile,
                  end.tile,
                  existing.from.tile,
                  existing.to.tile,
                )
              ) {
                return false;
              }
              if (
                pointToSegmentDistance(existing.from, start, end) < 0.45 ||
                pointToSegmentDistance(existing.to, start, end) < 0.45 ||
                pointToSegmentDistance(start, existing.from, existing.to) < 0.45 ||
                pointToSegmentDistance(end, existing.from, existing.to) < 0.45
              ) {
                return false;
              }
            }

            return true;
          }),
          rng,
        );

        if (endCandidates.length > 0) {
          const preferred =
            endCandidates.find(
              (end) => Math.abs(end.row - start.row) <= 3,
            ) ?? endCandidates[0];
          chosen = { type: spec.type, from: start, to: preferred };
          break;
        }
      }

      if (!chosen) return null;
      if (Math.abs(chosen.to.row - chosen.from.row) === 4) {
        longJumpCount += 1;
      }
      placed.push(chosen);
      endpoints.push(chosen.from, chosen.to);
    }

    // Tempatkan 6 petak soal (2 bawah, 2 tengah, 2 atas), tidak tumpang tindih & berjarak
    const questionZones: Array<[number, number]> = [
      [0, 2],
      [0, 2],
      [3, 6],
      [3, 6],
      [7, 9],
      [7, 9],
    ];
    const usedEndpointTiles = new Set(endpoints.map((ep) => ep.tile));
    const questionPoints: GridPoint[] = [];

    for (const [minRow, maxRow] of questionZones) {
      const candidates = shuffleWithRng(
        allPoints.filter(
          (p) =>
            p.row >= minRow &&
            p.row <= maxRow &&
            !usedEndpointTiles.has(p.tile) &&
            questionPoints.every((qp) => chebyshevDistance(p, qp) >= 2),
        ),
        rng,
      );
      if (candidates.length === 0) return null;
      questionPoints.push(candidates[0]);
    }

    return {
      paths: placed,
      questions: questionPoints.map((q) => q.tile),
    };
  };

  let layout: { paths: PlacedPath[]; questions: number[] } | null = null;
  for (let attempt = 0; attempt < 250; attempt += 1) {
    layout = tryGenerate();
    if (layout) break;
  }

  const cells: BoardCell[] = Array.from({ length: 100 }, (_, i) => ({
    index: i + 1,
    type: 'NORMAL' as TileEffect,
  }));

  if (layout) {
    for (const path of layout.paths) {
      cells[path.from.tile - 1] = {
        index: path.from.tile,
        type: path.type,
        to: path.to.tile,
      };
    }
    for (const qTile of layout.questions) {
      cells[qTile - 1] = { index: qTile, type: 'QUESTION' };
    }
  } else {
    for (const [from, to] of FALLBACK_LADDERS) {
      cells[from - 1] = { index: from, type: 'LADDER', to };
    }
    for (const [from, to] of FALLBACK_SNAKES) {
      cells[from - 1] = { index: from, type: 'SNAKE', to };
    }
    for (const qTile of FALLBACK_QUESTIONS) {
      cells[qTile - 1] = { index: qTile, type: 'QUESTION' };
    }
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
      connectDelayMs: config.connectDelayMs ?? 220,
      botJoinDelayMs: config.botJoinDelayMs ?? 600,
      // Tempo santai seperti bermain dengan manusia sungguhan (1.2 - 1.8 detik)
      botTurnDelayMs: config.botTurnDelayMs ?? 1_500,
      botAnswerDelayMs: config.botAnswerDelayMs ?? 1_700,
      postMoveDelayMs: config.postMoveDelayMs ?? 1_400,
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
      // Variasi jeda berpikir manusiawi ±20% (1.2s - 1.8s untuk default 1.5s)
      const jitterFactor =
        this.timing.botTurnDelayMs >= 500
          ? 0.8 + this.rng() * 0.4
          : 1;
      const thinkMs = Math.round(this.timing.botTurnDelayMs * jitterFactor);
      this.schedule(() => {
        if (
          this.roomStatus === 'PLAYING' &&
          this.turnOrder[this.turnIndex] === activeId &&
          !this.pendingQuestion
        ) {
          this.executeRoll(activeId);
        }
      }, thinkMs);
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
      const jitterFactor =
        this.timing.botAnswerDelayMs >= 500
          ? 0.82 + this.rng() * 0.36
          : 1;
      const answerMs = Math.round(this.timing.botAnswerDelayMs * jitterFactor);
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
      }, answerMs);
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
