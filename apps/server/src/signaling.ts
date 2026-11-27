import { randomInt } from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';
import {
  parseClientMessage,
  type ClientMessage,
  type DeviceId,
  type RejectReason,
  type ServerMessage,
} from '@remora/shared';

/** Connection attempts allowed per client and per minute (brute-force protection). */
const MAX_ATTEMPTS_PER_MINUTE = 5;
/** Largest WebSocket message accepted, in bytes. */
const MAX_PAYLOAD_BYTES = 128 * 1024;
/** Interval between two liveness checks of each connection. */
const HEARTBEAT_INTERVAL_MS = 30_000;

/** State the server keeps for each connected app. */
interface Client {
  socket: WebSocket;
  /** Public ID, set once the app has registered as a host. */
  hostId: DeviceId | null;
  /** The other side of the current session. */
  peer: Client | null;
  /** Host side: viewer waiting for an answer. */
  pendingViewer: Client | null;
  /** Viewer side: host that has been asked. */
  pendingHost: Client | null;
  /** Timestamps of recent connection attempts. */
  attempts: number[];
  isAlive: boolean;
}

export interface SignalingServer {
  /** Port actually listened on (useful when started on port 0). */
  port: number;
  close(): Promise<void>;
}

export function startSignalingServer(port: number): Promise<SignalingServer> {
  const wss = new WebSocketServer({ port, maxPayload: MAX_PAYLOAD_BYTES });
  const clients = new Map<WebSocket, Client>();
  const hosts = new Map<DeviceId, Client>();

  function send(client: Client | null, message: ServerMessage): void {
    if (client?.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify(message));
    }
  }

  function reject(viewer: Client, reason: RejectReason): void {
    send(viewer, { type: 'rejected', reason });
  }

  function newHostId(): DeviceId {
    let id: DeviceId;
    do {
      id = String(randomInt(100_000_000, 1_000_000_000));
    } while (hosts.has(id));
    return id;
  }

  function isRateLimited(client: Client): boolean {
    const now = Date.now();
    client.attempts = client.attempts.filter((time) => now - time < 60_000);
    client.attempts.push(now);
    return client.attempts.length > MAX_ATTEMPTS_PER_MINUTE;
  }

  function endSession(client: Client): void {
    const peer = client.peer;
    if (!peer) return;
    client.peer = null;
    peer.peer = null;
    send(peer, { type: 'session-ended' });
  }

  function handleMessage(client: Client, message: ClientMessage): void {
    switch (message.type) {
      case 'register-host': {
        client.hostId ??= newHostId();
        hosts.set(client.hostId, client);
        send(client, { type: 'registered', id: client.hostId });
        break;
      }

      case 'connect-request': {
        if (isRateLimited(client)) {
          reject(client, 'rate-limited');
          return;
        }
        if (client.peer || client.pendingHost) {
          reject(client, 'busy');
          return;
        }
        const host = hosts.get(message.targetId);
        if (!host || host === client) {
          reject(client, 'unknown-device');
          return;
        }
        if (host.peer || host.pendingViewer) {
          reject(client, 'busy');
          return;
        }

        host.pendingViewer = client;
        client.pendingHost = host;
        // The password is checked by the host itself: the server only relays it, never stores it.
        send(host, {
          type: 'connect-request',
          password: message.password,
          viewerName: message.viewerName,
        });
        break;
      }

      case 'connect-response': {
        const viewer = client.pendingViewer;
        if (!viewer) return;
        client.pendingViewer = null;
        viewer.pendingHost = null;

        if (message.accepted) {
          client.peer = viewer;
          viewer.peer = client;
          send(viewer, { type: 'accepted' });
        } else {
          reject(viewer, message.reason ?? 'declined');
        }
        break;
      }

      case 'cancel-request': {
        const host = client.pendingHost;
        if (!host) return;
        host.pendingViewer = null;
        client.pendingHost = null;
        send(host, { type: 'request-cancelled' });
        break;
      }

      case 'signal': {
        // Relayed only between the two peers of an accepted session.
        send(client.peer, { type: 'signal', data: message.data });
        break;
      }

      case 'end-session':
        endSession(client);
        break;
    }
  }

  function handleClose(client: Client): void {
    clients.delete(client.socket);
    if (client.hostId) hosts.delete(client.hostId);

    const viewer = client.pendingViewer;
    if (viewer) {
      viewer.pendingHost = null;
      reject(viewer, 'host-disconnected');
    }
    const host = client.pendingHost;
    if (host) {
      host.pendingViewer = null;
      send(host, { type: 'request-cancelled' });
    }
    endSession(client);
  }

  wss.on('connection', (socket) => {
    const client: Client = {
      socket,
      hostId: null,
      peer: null,
      pendingViewer: null,
      pendingHost: null,
      attempts: [],
      isAlive: true,
    };
    clients.set(socket, client);

    socket.on('pong', () => {
      client.isAlive = true;
    });
    socket.on('message', (data, isBinary) => {
      if (isBinary) return;
      // eslint-disable-next-line @typescript-eslint/no-base-to-string -- text frames are Buffers
      const message = parseClientMessage(data.toString());
      if (message) handleMessage(client, message);
    });
    socket.on('close', () => {
      handleClose(client);
    });
  });

  // Detects dead connections (unplugged cable, sleeping laptop...).
  const heartbeat = setInterval(() => {
    for (const client of clients.values()) {
      if (!client.isAlive) {
        client.socket.terminate();
        continue;
      }
      client.isAlive = false;
      client.socket.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);

  return new Promise((resolve, reject) => {
    wss.once('error', reject);
    wss.once('listening', () => {
      const address = wss.address();
      resolve({
        port: address !== null && typeof address === 'object' ? address.port : port,
        close: () =>
          new Promise((done) => {
            clearInterval(heartbeat);
            for (const client of clients.values()) client.socket.terminate();
            wss.close(() => {
              done();
            });
          }),
      });
    });
  });
}
