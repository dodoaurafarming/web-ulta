import type {
  ClientMessage,
  ClientMessagePayload,
  ConnectionStatus,
} from '../types/protocol';
import type {
  GameTransport,
  TransportCallbacks,
  TransportConnectOptions,
} from './transport';

export interface WebSocketLike {
  readonly readyState: number;
  onopen: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onclose: ((event: { code?: number; reason?: string }) => void) | null;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export type WebSocketConstructor = new (url: string) => WebSocketLike;

const WS_OPEN = 1;
const DEFAULT_HEARTBEAT_MS = 7_000;
const RECONNECT_DELAYS_MS = [1_500, 3_000, 5_000];

export interface WebSocketTransportConfig {
  WebSocketImpl?: WebSocketConstructor;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
}

/**
 * Transport WebSocket asli untuk protokol ULTA/1.0 (Flat JSON).
 * Mematuhi prinsip Authoritative Server: tidak ada kalkulasi dadu,
 * posisi papan, timer permainan, maupun evaluasi soal di sisi client.
 */
export class WebSocketTransport implements GameTransport {
  public readonly mode = 'websocket' as const;

  private readonly wsCtor: WebSocketConstructor | null;
  private readonly autoReconnect: boolean;
  private readonly maxReconnectAttempts: number;

  private socket: WebSocketLike | null = null;
  private status: ConnectionStatus = 'disconnected';
  private seq = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private manualDisconnect = false;

  private lastOptions: TransportConnectOptions | null = null;
  private callbacks: TransportCallbacks | null = null;

  constructor(config: WebSocketTransportConfig = {}) {
    this.wsCtor =
      config.WebSocketImpl ??
      (typeof WebSocket !== 'undefined'
        ? (WebSocket as unknown as WebSocketConstructor)
        : null);
    this.autoReconnect = config.autoReconnect ?? true;
    this.maxReconnectAttempts = config.maxReconnectAttempts ?? 3;
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public connect(
    options: TransportConnectOptions,
    callbacks: TransportCallbacks,
  ): void {
    this.teardownSocketOnly();
    this.clearReconnectTimer();

    this.manualDisconnect = false;
    this.reconnectAttempts = 0;
    this.lastOptions = { ...options };
    this.callbacks = callbacks;

    this.openSocket(options, false);
  }

  public send(payload: ClientMessagePayload): ClientMessage | null {
    if (!this.socket || this.socket.readyState !== WS_OPEN) {
      return null;
    }

    this.seq += 1;
    // Format wajib ULTA/1.0: flat JSON tanpa pembungkus "payload"
    const message: ClientMessage = {
      ...payload,
      seq: this.seq,
    };

    try {
      this.socket.send(JSON.stringify(message));
      return message;
    } catch {
      this.callbacks?.onTransportError(
        'Gagal mengirim pesan ke server WebSocket.',
      );
      return null;
    }
  }

  public disconnect(): void {
    this.manualDisconnect = true;
    this.clearReconnectTimer();
    this.clearHeartbeatTimer();
    this.teardownSocketOnly();
    this.setStatus('disconnected');
  }

  private openSocket(
    options: TransportConnectOptions,
    isReconnectAttempt: boolean,
  ): void {
    if (!this.wsCtor) {
      this.setStatus('disconnected');
      this.callbacks?.onTransportError(
        'WebSocket tidak tersedia pada lingkungan ini.',
      );
      return;
    }

    this.seq = 0;
    this.setStatus(isReconnectAttempt ? 'reconnecting' : 'connecting');

    let ws: WebSocketLike;
    try {
      ws = new this.wsCtor(options.url);
    } catch {
      this.setStatus('disconnected');
      this.callbacks?.onTransportError(
        `URL WebSocket tidak valid atau gagal dibuka: ${options.url}`,
      );
      return;
    }

    this.socket = ws;

    ws.onopen = () => {
      if (this.socket !== ws) return;
      this.reconnectAttempts = 0;
      this.setStatus('connected');

      // Wajib segera kirim HELLO (atau RECONNECT bila diminta dengan token tersimpan)
      if (options.useReconnect && options.token) {
        this.send({ type: 'RECONNECT', token: options.token });
      } else {
        this.send({ type: 'HELLO', name: options.playerName });
      }

      // Jalankan heartbeat PING otomatis setiap 7 detik (timeout server 20 detik)
      this.startHeartbeat(options.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_MS);
    };

    ws.onmessage = (event) => {
      if (this.socket !== ws) return;
      if (typeof event.data === 'string') {
        this.callbacks?.onRawMessage(event.data);
      }
    };

    ws.onerror = () => {
      if (this.socket !== ws) return;
      this.callbacks?.onTransportError(
        'Gangguan koneksi WebSocket ke server permainan.',
      );
    };

    ws.onclose = () => {
      if (this.socket !== ws) return;
      this.clearHeartbeatTimer();
      this.socket = null;

      if (this.manualDisconnect) {
        this.setStatus('disconnected');
        return;
      }

      if (
        this.autoReconnect &&
        this.lastOptions &&
        this.reconnectAttempts < this.maxReconnectAttempts
      ) {
        const delayMs =
          RECONNECT_DELAYS_MS[
            Math.min(this.reconnectAttempts, RECONNECT_DELAYS_MS.length - 1)
          ];
        this.reconnectAttempts += 1;
        this.setStatus('reconnecting');

        this.clearReconnectTimer();
        this.reconnectTimer = setTimeout(() => {
          if (this.manualDisconnect || !this.lastOptions) return;
          this.openSocket(this.lastOptions, true);
        }, delayMs);
      } else {
        this.setStatus('disconnected');
      }
    };
  }

  private startHeartbeat(intervalMs: number): void {
    this.clearHeartbeatTimer();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'PING' });
    }, intervalMs);
  }

  private clearHeartbeatTimer(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private teardownSocketOnly(): void {
    this.clearHeartbeatTimer();
    if (!this.socket) return;

    const current = this.socket;
    this.socket = null;
    current.onopen = null;
    current.onmessage = null;
    current.onerror = null;
    current.onclose = null;

    try {
      current.close(1000, 'Client disconnect');
    } catch {
      // Abaikan error saat menutup soket yang sudah tertutup
    }
  }

  private setStatus(next: ConnectionStatus): void {
    if (this.status === next) return;
    this.status = next;
    this.callbacks?.onStatusChange(next);
  }
}
