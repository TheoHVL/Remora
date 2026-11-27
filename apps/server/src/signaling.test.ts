import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { parseServerMessage, type ClientMessage, type ServerMessage } from '@remora/shared';
import { startSignalingServer, type SignalingServer } from './signaling.js';

/** A fake desktop app: sends messages and waits for the server's answers, in order. */
class TestClient {
  private readonly inbox: ServerMessage[] = [];
  private readonly waiters: ((message: ServerMessage) => void)[] = [];

  private constructor(private readonly socket: WebSocket) {
    socket.on('message', (data) => {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string -- text frames are Buffers
      const message = parseServerMessage(data.toString());
      if (!message) throw new Error('Server sent an invalid message');
      const waiter = this.waiters.shift();
      if (waiter) waiter(message);
      else this.inbox.push(message);
    });
  }

  static connect(port: number): Promise<TestClient> {
    const socket = new WebSocket(`ws://localhost:${port}`);
    return new Promise((resolve, reject) => {
      socket.once('open', () => {
        resolve(new TestClient(socket));
      });
      socket.once('error', reject);
    });
  }

  send(message: ClientMessage | Record<string, unknown>): void {
    this.socket.send(JSON.stringify(message));
  }

  sendRaw(text: string): void {
    this.socket.send(text);
  }

  next(): Promise<ServerMessage> {
    const message = this.inbox.shift();
    if (message) return Promise.resolve(message);
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  close(): void {
    this.socket.close();
  }
}

let server: SignalingServer;
let host: TestClient;
let viewer: TestClient;
let hostId: string;

const request = (password = 'secret') =>
  ({ type: 'connect-request', targetId: hostId, password, viewerName: 'IT support' }) as const;

beforeEach(async () => {
  server = await startSignalingServer(0); // port 0 = any free port
  host = await TestClient.connect(server.port);
  viewer = await TestClient.connect(server.port);

  host.send({ type: 'register-host' });
  const registered = await host.next();
  if (registered.type !== 'registered') throw new Error('Host registration failed');
  hostId = registered.id;
});

afterEach(async () => {
  await server.close();
});

describe('registration', () => {
  it('gives the host a 9-digit ID', () => {
    expect(hostId).toMatch(/^\d{9}$/);
  });

  it('keeps the same ID if the host registers twice', async () => {
    host.send({ type: 'register-host' });
    expect(await host.next()).toEqual({ type: 'registered', id: hostId });
  });
});

describe('connection request', () => {
  it('rejects an unknown device', async () => {
    viewer.send({ ...request(), targetId: '000000000' });
    expect(await viewer.next()).toEqual({ type: 'rejected', reason: 'unknown-device' });
  });

  it('forwards the password and name to the host', async () => {
    viewer.send(request('my-password'));
    expect(await host.next()).toEqual({
      type: 'connect-request',
      password: 'my-password',
      viewerName: 'IT support',
    });
  });

  it('tells the viewer when the host declines', async () => {
    viewer.send(request());
    await host.next();
    host.send({ type: 'connect-response', accepted: false, reason: 'wrong-password' });
    expect(await viewer.next()).toEqual({ type: 'rejected', reason: 'wrong-password' });
  });

  it('refuses a second viewer while a request is pending', async () => {
    const other = await TestClient.connect(server.port);
    viewer.send(request());
    await host.next();
    other.send(request());
    expect(await other.next()).toEqual({ type: 'rejected', reason: 'busy' });
  });

  it('notifies the host when the viewer cancels', async () => {
    viewer.send(request());
    await host.next();
    viewer.send({ type: 'cancel-request' });
    expect(await host.next()).toEqual({ type: 'request-cancelled' });
  });

  it('limits the number of attempts per minute', async () => {
    for (let i = 0; i < 5; i++) {
      viewer.send({ ...request(), targetId: '000000000' });
      await viewer.next();
    }
    viewer.send(request());
    expect(await viewer.next()).toEqual({ type: 'rejected', reason: 'rate-limited' });
  });
});

describe('session', () => {
  beforeEach(async () => {
    viewer.send(request());
    await host.next();
    host.send({ type: 'connect-response', accepted: true });
    expect(await viewer.next()).toEqual({ type: 'accepted' });
  });

  it('relays WebRTC signals in both directions', async () => {
    const offer = { sdp: { type: 'offer', sdp: 'v=0...' } } as const;
    const answer = { sdp: { type: 'answer', sdp: 'v=0...' } } as const;

    host.send({ type: 'signal', data: offer });
    expect(await viewer.next()).toEqual({ type: 'signal', data: offer });
    viewer.send({ type: 'signal', data: answer });
    expect(await host.next()).toEqual({ type: 'signal', data: answer });
  });

  it('notifies the other peer when the session ends', async () => {
    viewer.send({ type: 'end-session' });
    expect(await host.next()).toEqual({ type: 'session-ended' });
  });

  it('notifies the other peer when one of them disconnects', async () => {
    host.close();
    expect(await viewer.next()).toEqual({ type: 'session-ended' });
  });
});

describe('robustness', () => {
  it('ignores invalid messages and keeps working', async () => {
    viewer.sendRaw('{not json');
    viewer.send({ type: 'hack-the-server' });
    viewer.send({ type: 'signal', data: { sdp: 'not an object' } });

    viewer.send({ ...request(), targetId: '000000000' });
    expect(await viewer.next()).toEqual({ type: 'rejected', reason: 'unknown-device' });
  });

  it('does not relay signals outside of a session', async () => {
    viewer.send({ type: 'signal', data: { sdp: { type: 'offer', sdp: 'x' } } });
    host.send({ type: 'register-host' });
    // The next message the host receives is the answer to its own request, not the signal.
    expect((await host.next()).type).toBe('registered');
  });
});
