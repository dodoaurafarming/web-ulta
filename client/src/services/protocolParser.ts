import {
  PROTOCOL_ERROR_MESSAGES,
  type AnswerResultEvent,
  type BoardCell,
  type ErrorEvent,
  type GameOverEvent,
  type GameStartEvent,
  type JumpEffect,
  type MoveEvent,
  type PlayerConnectionState,
  type PlayerStatusEvent,
  type PongEvent,
  type QuestionEvent,
  type QuizChoice,
  type RankingEntry,
  type RoomPlayer,
  type RoomStateEvent,
  type ServerEvent,
  type TileEffect,
  type TurnEvent,
  type WelcomeEvent,
} from '../types/protocol';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === 'true') return true;
  if (value === 0 || value === 'false') return false;
  return undefined;
}

function normalizeTileEffect(value: unknown): TileEffect {
  const raw = asString(value)?.toUpperCase();
  if (raw === 'SNAKE' || raw === 'LADDER' || raw === 'QUESTION') {
    return raw;
  }
  return 'NORMAL';
}

function normalizeJumpEffects(rawEffects: unknown): JumpEffect[] {
  if (!Array.isArray(rawEffects)) return [];
  const parsed: JumpEffect[] = [];

  for (const item of rawEffects) {
    if (!isRecord(item)) continue;
    const kind = asString(item.kind ?? item.type ?? item.effect)?.toUpperCase();
    const from = asNumber(item.from ?? item.start);
    const to = asNumber(item.to ?? item.target ?? item.end);
    if (
      (kind === 'SNAKE' || kind === 'LADDER') &&
      from !== undefined &&
      to !== undefined
    ) {
      parsed.push({ from, kind, to });
    }
  }

  return parsed;
}

function normalizeConnectionState(
  rawStatus: unknown,
  rawOnline: unknown,
): PlayerConnectionState {
  const statusStr = asString(rawStatus)?.toLowerCase();
  if (statusStr === 'online' || statusStr === 'offline' || statusStr === 'left') {
    return statusStr;
  }
  const onlineBool = asBoolean(rawOnline);
  if (onlineBool === false) return 'offline';
  return 'online';
}

function normalizePlayers(
  rawPlayers: unknown,
  hostId: string | null,
): RoomPlayer[] {
  const entries: Array<{ fallbackId?: string; value: unknown }> = [];

  if (Array.isArray(rawPlayers)) {
    for (const item of rawPlayers) {
      entries.push({ value: item });
    }
  } else if (isRecord(rawPlayers)) {
    for (const [key, value] of Object.entries(rawPlayers)) {
      entries.push({ fallbackId: key, value });
    }
  }

  return entries.map(({ fallbackId, value }, index) => {
    if (typeof value === 'string') {
      const playerId = fallbackId ?? value;
      return {
        playerId,
        name: value,
        ready: false,
        online: true,
        status: 'online',
        isHost: hostId !== null && (playerId === hostId || value === hostId),
        position: 1,
        colorIndex: index % 5,
      };
    }

    const obj = isRecord(value) ? value : {};
    const playerId =
      asString(obj.player_id) ??
      asString(obj.id) ??
      asString(obj.uid) ??
      fallbackId ??
      `player_${index + 1}`;
    const name =
      asString(obj.name) ??
      asString(obj.player_name) ??
      asString(obj.username) ??
      playerId;
    const status = normalizeConnectionState(
      obj.status ?? obj.connection_status,
      obj.online ?? obj.is_online ?? obj.connected,
    );
    const ready = asBoolean(obj.ready ?? obj.is_ready) ?? false;
    const isHost =
      asBoolean(obj.is_host ?? obj.host) ??
      (hostId !== null && (playerId === hostId || name === hostId));
    const position = Math.max(
      1,
      Math.min(100, asNumber(obj.position ?? obj.pos ?? obj.tile) ?? 1),
    );
    const colorIndex = asNumber(obj.color_index ?? obj.colorIndex) ?? index % 5;

    return {
      playerId,
      name,
      ready,
      online: status === 'online',
      status,
      isHost,
      position,
      colorIndex,
    };
  });
}

/**
 * Mendukung 3 format board:
 * 1. Format asli `board.py` / `game.py`: array 101 elemen `[null, { kind: "NORMAL" }, ..., { kind: "SNAKE", to: 12 }]`
 * 2. Format array 100 elemen (indeks 0..99 atau tiap sel membawa `index: 1..100`, dipakai Mock Mode)
 * 3. Format dict `{ "1": {...}, ..., "100": {...} }`
 */
function normalizeBoard(rawBoard: unknown): BoardCell[] {
  const byIndex = new Map<number, BoardCell>();

  const ingestCell = (item: unknown, fallbackIndex: number) => {
    if (item === null || item === undefined) return;
    if (!isRecord(item)) {
      if (fallbackIndex >= 1 && fallbackIndex <= 100) {
        byIndex.set(fallbackIndex, { index: fallbackIndex, type: 'NORMAL' });
      }
      return;
    }

    const idx =
      asNumber(item.index ?? item.cell ?? item.tile ?? item.id ?? item.pos) ??
      fallbackIndex;
    if (idx < 1 || idx > 100) return;

    const type = normalizeTileEffect(item.type ?? item.kind ?? item.effect);
    const to = asNumber(item.to ?? item.target ?? item.destination);

    byIndex.set(idx, {
      index: idx,
      type,
      ...(to !== undefined && (type === 'SNAKE' || type === 'LADDER')
        ? { to }
        : {}),
    });
  };

  if (Array.isArray(rawBoard)) {
    // Deteksi array 1-indexed dari board.py: panjang 101 dengan elemen ke-0 bernilai null
    const isOneIndexedPythonBoard =
      rawBoard.length === 101 && (rawBoard[0] === null || rawBoard[0] === undefined);

    if (isOneIndexedPythonBoard) {
      for (let i = 1; i <= 100; i += 1) {
        ingestCell(rawBoard[i], i);
      }
    } else {
      rawBoard.forEach((cell, i) => ingestCell(cell, i + 1));
    }
  } else if (isRecord(rawBoard)) {
    for (const [key, cell] of Object.entries(rawBoard)) {
      const numericKey = asNumber(key) ?? 0;
      ingestCell(cell, numericKey);
    }
  }

  const normalized: BoardCell[] = [];
  for (let i = 1; i <= 100; i += 1) {
    normalized.push(byIndex.get(i) ?? { index: i, type: 'NORMAL' });
  }
  return normalized;
}

function normalizeQuizOptions(
  rawOptions: unknown,
): Record<QuizChoice, string> {
  const keys: QuizChoice[] = ['A', 'B', 'C', 'D'];
  const result: Record<QuizChoice, string> = {
    A: '',
    B: '',
    C: '',
    D: '',
  };

  if (Array.isArray(rawOptions)) {
    keys.forEach((key, idx) => {
      result[key] = asString(rawOptions[idx]) ?? `Opsi ${key}`;
    });
    return result;
  }

  if (isRecord(rawOptions)) {
    for (const key of keys) {
      result[key] =
        asString(rawOptions[key]) ??
        asString(rawOptions[key.toLowerCase()]) ??
        `Opsi ${key}`;
    }
  }

  return result;
}

function normalizeRanking(
  rawRanking: unknown,
  winnerId?: string | null,
  winnerName?: string,
): RankingEntry[] {
  if (!Array.isArray(rawRanking)) return [];

  return rawRanking.map((item, idx) => {
    if (typeof item === 'string') {
      const isWinner =
        idx === 0 || item === winnerId || item === winnerName;
      return {
        rank: idx + 1,
        name: item,
        position: isWinner ? 100 : 1,
        isWinner,
      };
    }

    const obj = isRecord(item) ? item : {};
    const playerId = asString(obj.player_id ?? obj.id);
    const name =
      asString(obj.name ?? obj.player_name) ?? playerId ?? `Pemain ${idx + 1}`;
    const rank = asNumber(obj.rank ?? obj.place) ?? idx + 1;
    const position = Math.max(
      1,
      Math.min(
        100,
        asNumber(obj.final_position ?? obj.position ?? obj.pos ?? obj.tile) ?? 1,
      ),
    );
    const isWinner =
      asBoolean(obj.is_winner ?? obj.winner) ??
      (rank === 1 ||
        (Boolean(winnerId) && playerId === winnerId) ||
        (winnerName !== undefined && name === winnerName));

    return {
      rank,
      ...(playerId ? { playerId } : {}),
      name,
      position,
      isWinner,
    };
  });
}

export function formatProtocolErrorMessage(
  code: number,
  serverMessage?: string,
): string {
  const cleaned = serverMessage?.trim();
  if (cleaned) return cleaned;
  return (
    PROTOCOL_ERROR_MESSAGES[code] ??
    `Terjadi kesalahan protokol (kode ${code}).`
  );
}

export function parseServerEvent(raw: string | unknown): ServerEvent | null {
  let data: unknown = raw;

  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!isRecord(data)) {
    return null;
  }

  const eventType = asString(data.type)?.toUpperCase();
  if (!eventType) return null;

  const seq = asNumber(data.seq);

  switch (eventType) {
    case 'WELCOME': {
      const playerId =
        asString(data.player_id) ?? asString(data.id) ?? '';
      const token = asString(data.token) ?? '';
      if (!playerId) return null;

      const event: WelcomeEvent = {
        type: 'WELCOME',
        ...(seq !== undefined ? { seq } : {}),
        playerId,
        token,
        ...(asString(data.name) ? { name: asString(data.name) } : {}),
      };
      return event;
    }

    case 'ROOM_STATE': {
      const roomCode = (
        asString(data.room_code) ??
        asString(data.code) ??
        ''
      ).toUpperCase();
      const topHostId =
        asString(data.host_id) ??
        asString(data.host) ??
        asString(data.host_player_id) ??
        null;
      const players = normalizePlayers(data.players, topHostId);
      const resolvedHostId =
        topHostId ?? players.find((p) => p.isHost)?.playerId ?? null;
      const rawMaxPlayers = asNumber(data.max_players ?? data.capacity);
      const status = (
        asString(data.status ?? data.state) ?? 'LOBBY'
      ).toUpperCase();
      const phase = asString(data.phase)?.toUpperCase();

      const event: RoomStateEvent = {
        type: 'ROOM_STATE',
        ...(seq !== undefined ? { seq } : {}),
        roomCode,
        hostId: resolvedHostId,
        maxPlayers: rawMaxPlayers ?? null,
        status,
        ...(phase ? { phase } : {}),
        players,
      };
      return event;
    }

    case 'GAME_START': {
      const board = normalizeBoard(data.board ?? data.tiles ?? data.cells);
      const hostId =
        asString(data.host_id) ?? asString(data.host) ?? null;
      const rawOrder = data.turn_order ?? data.order;
      let turnOrder: string[] = [];

      if (Array.isArray(rawOrder)) {
        turnOrder = rawOrder
          .map((item) =>
            isRecord(item)
              ? asString(item.player_id ?? item.id)
              : asString(item),
          )
          .filter((id): id is string => Boolean(id));
      }

      const players =
        data.players !== undefined
          ? normalizePlayers(data.players, hostId)
          : undefined;

      if (turnOrder.length === 0 && players && players.length > 0) {
        turnOrder = players.map((p) => p.playerId);
      }

      const roomCode = (
        asString(data.room_code) ?? asString(data.code)
      )?.toUpperCase();
      const seed = asNumber(data.seed);

      const event: GameStartEvent = {
        type: 'GAME_START',
        ...(seq !== undefined ? { seq } : {}),
        ...(roomCode ? { roomCode } : {}),
        ...(seed !== undefined ? { seed } : {}),
        board,
        turnOrder,
        ...(players ? { players } : {}),
      };
      return event;
    }

    case 'TURN': {
      // Kontrak asli game.py menggunakan `active_player_id`, `turn_no`, `deadline_in`
      const playerId =
        asString(data.active_player_id) ??
        asString(data.player_id) ??
        asString(data.player) ??
        asString(data.current_player) ??
        '';
      if (!playerId) return null;

      const deadline =
        asNumber(data.deadline_in ?? data.deadline ?? data.timeout) ?? 10;
      const turnNo = asNumber(data.turn_no);

      const event: TurnEvent = {
        type: 'TURN',
        ...(seq !== undefined ? { seq } : {}),
        playerId,
        ...(turnNo !== undefined ? { turnNo } : {}),
        deadline,
      };
      return event;
    }

    case 'MOVE': {
      const playerId =
        asString(data.player_id) ?? asString(data.player) ?? '';
      if (!playerId) return null;

      const dice = asNumber(data.dice ?? data.roll) ?? 1;
      const from = asNumber(data.from ?? data.from_pos) ?? 1;
      const to = asNumber(data.to ?? data.to_pos) ?? from;
      const rawPath = Array.isArray(data.path)
        ? data.path
            .map((step) => asNumber(step))
            .filter((step): step is number => step !== undefined)
        : [];
      const path = rawPath.length > 0 ? rawPath : [to];

      // Kontrak asli game.py mengirim array `effects: [{ from, kind, to }]`
      let effects = normalizeJumpEffects(data.effects);
      const rawSingularEffect = normalizeTileEffect(data.effect);

      if (
        effects.length === 0 &&
        (rawSingularEffect === 'SNAKE' || rawSingularEffect === 'LADDER')
      ) {
        const landing = path[path.length - 1] ?? from;
        if (landing !== to) {
          effects = [{ from: landing, kind: rawSingularEffect, to }];
        }
      }

      const effect: TileEffect =
        effects.length > 0 ? effects[0].kind : rawSingularEffect;

      const event: MoveEvent = {
        type: 'MOVE',
        ...(seq !== undefined ? { seq } : {}),
        playerId,
        dice,
        from,
        path,
        effect,
        effects,
        to,
      };
      return event;
    }

    case 'QUESTION': {
      const qId =
        asString(data.q_id) ??
        asString(data.question_id) ??
        asString(data.id) ??
        '';
      const playerId =
        asString(data.player_id) ?? asString(data.player) ?? '';
      const prompt =
        asString(data.text) ??
        asString(data.question) ??
        asString(data.prompt) ??
        '';
      if (!qId || !playerId || !prompt) return null;

      const options = normalizeQuizOptions(data.options ?? data.choices);
      const deadline =
        asNumber(data.deadline_in ?? data.deadline ?? data.timeout) ?? 20;
      const bonusDice = asNumber(data.bonus_dice ?? data.bonus);
      const turnNo = asNumber(data.turn_no);
      const category = asString(data.category);

      // Authoritative Server: kunci jawaban tidak pernah diambil/diproses di client
      const event: QuestionEvent = {
        type: 'QUESTION',
        ...(seq !== undefined ? { seq } : {}),
        qId,
        playerId,
        ...(turnNo !== undefined ? { turnNo } : {}),
        prompt,
        options,
        ...(bonusDice !== undefined ? { bonusDice } : {}),
        deadline,
        ...(category ? { category } : {}),
      };
      return event;
    }

    case 'ANSWER_RESULT': {
      // Kontrak asli game.py TIDAK mengirim `player_id` pada ANSWER_RESULT;
      // reducer akan melengkapinya dari `activeQuestion.playerId` / `currentTurn.playerId`.
      const playerId = asString(data.player_id ?? data.player);
      const bonusDice = asNumber(data.bonus_dice ?? data.bonus ?? data.dice) ?? 0;
      const to = asNumber(data.to ?? data.to_pos ?? data.position);
      if (to === undefined) return null;

      const from = asNumber(data.from ?? data.from_pos);
      const rawPath = Array.isArray(data.path)
        ? data.path
            .map((step) => asNumber(step))
            .filter((step): step is number => step !== undefined)
        : undefined;
      const effects = normalizeJumpEffects(data.effects);
      const qId = asString(data.q_id ?? data.question_id);
      // Pertahankan undefined jika field `correct` tidak dikirim (mode penonton)
      const correct =
        data.correct !== undefined ? asBoolean(data.correct) : undefined;

      const event: AnswerResultEvent = {
        type: 'ANSWER_RESULT',
        ...(seq !== undefined ? { seq } : {}),
        ...(playerId ? { playerId } : {}),
        bonusDice,
        to,
        ...(from !== undefined ? { from } : {}),
        ...(rawPath ? { path: rawPath } : {}),
        effects,
        ...(qId ? { qId } : {}),
        ...(correct !== undefined ? { correct } : {}),
      };
      return event;
    }

    case 'PLAYER_STATUS': {
      const playerId =
        asString(data.player_id) ?? asString(data.player) ?? '';
      if (!playerId) return null;

      const status = normalizeConnectionState(data.status, data.online);
      const name = asString(data.name ?? data.player_name);

      const event: PlayerStatusEvent = {
        type: 'PLAYER_STATUS',
        ...(seq !== undefined ? { seq } : {}),
        playerId,
        status,
        ...(name ? { name } : {}),
      };
      return event;
    }

    case 'GAME_OVER': {
      let winnerId: string | null | undefined =
        data.winner_id === null ? null : asString(data.winner_id);
      let winnerName = asString(data.winner_name);

      if (isRecord(data.winner)) {
        winnerId = winnerId ?? asString(data.winner.player_id ?? data.winner.id);
        winnerName =
          winnerName ?? asString(data.winner.name ?? data.winner.player_name);
      } else {
        const winnerRaw = asString(data.winner);
        if (winnerRaw) {
          winnerName = winnerName ?? winnerRaw;
        }
      }

      // Kontrak asli game.py mengirim `rankings` (plural) berisi `final_position`
      const ranking = normalizeRanking(
        data.rankings ?? data.ranking,
        winnerId,
        winnerName,
      );
      const resolvedWinnerName =
        winnerName ??
        ranking.find((r) => r.isWinner)?.name ??
        ranking[0]?.name ??
        (winnerId ?? 'Tidak ada pemenang');

      const event: GameOverEvent = {
        type: 'GAME_OVER',
        ...(seq !== undefined ? { seq } : {}),
        ...(winnerId !== undefined ? { winnerId } : {}),
        winnerName: resolvedWinnerName,
        ranking,
      };
      return event;
    }

    case 'PONG': {
      const event: PongEvent = {
        type: 'PONG',
        ...(seq !== undefined ? { seq } : {}),
        timestamp: asNumber(data.ts ?? data.timestamp) ?? Date.now(),
      };
      return event;
    }

    case 'ERROR': {
      const code = asNumber(data.code) ?? 500;
      const message = formatProtocolErrorMessage(
        code,
        asString(data.message ?? data.msg ?? data.detail),
      );

      const event: ErrorEvent = {
        type: 'ERROR',
        ...(seq !== undefined ? { seq } : {}),
        code,
        message,
      };
      return event;
    }

    default:
      return null;
  }
}
