import { PROTOCOL_VERSION } from '@remora/shared';
import { startSignalingServer } from './signaling.js';

const port = Number(process.env.PORT ?? 8080);

const server = await startSignalingServer(port);
console.log(
  `Remora signaling server (protocol v${PROTOCOL_VERSION}) listening on port ${server.port}`,
);

// Ctrl+C or `docker stop`: close connections cleanly before exiting.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void server.close().then(() => process.exit(0));
  });
}
