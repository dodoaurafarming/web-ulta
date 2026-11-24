import type {
  ClientMessage,
  ClientMessagePayload,
  ConnectionStatus,
} from '../types/protocol';

export interface TransportConnectOptions {
  url: string;
  playerName: string;
  /**
   * Jika diisi dan useReconnect = true, kirim RECONNECT alih-alih HELLO saat onopen.
   * Default (false): selalu kirim HELLO segera saat onopen sesuai spesifikasi ULTA/1.0.
   */
  token?: string;
  useReconnect?: boolean;
  heartbeatIntervalMs?: number;
}

export interface TransportCallbacks {
  onStatusChange: (status: ConnectionStatus) => void;
  onRawMessage: (rawJson: string) => void;
  onTransportError: (message: string) => void;
}

export interface GameTransport {
  readonly mode: 'websocket' | 'mock';
  connect(options: TransportConnectOptions, callbacks: TransportCallbacks): void;
  send(payload: ClientMessagePayload): ClientMessage | null;
  disconnect(): void;
  getStatus(): ConnectionStatus;
}
