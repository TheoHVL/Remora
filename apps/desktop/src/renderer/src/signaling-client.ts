import { parseServerMessage, type ClientMessage, type ServerMessage } from '@remora/shared';

const RECONNECT_DELAY_MS = 3_000;

export interface SignalingCallbacks {
  onOnline(): void;
  onOffline(): void;
  onMessage(message: ServerMessage): void;
}

/** Connection to the signaling server, re-established automatically when lost. */
export class SignalingClient {
  private socket: WebSocket | null = null;

  constructor(
    private readonly url: string,
    private readonly callbacks: SignalingCallbacks,
  ) {}

  connect(): void {
    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.addEventListener('open', () => {
      this.callbacks.onOnline();
    });

    socket.addEventListener('message', (event: MessageEvent<unknown>) => {
      if (typeof event.data !== 'string') return;
      const message = parseServerMessage(event.data);
      if (message) this.callbacks.onMessage(message);
    });

    socket.addEventListener('close', () => {
      this.socket = null;
      this.callbacks.onOffline();
      setTimeout(() => {
        this.connect();
      }, RECONNECT_DELAY_MS);
    });
  }

  send(message: ClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }
}
