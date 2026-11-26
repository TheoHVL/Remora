import { describe, expect, it } from 'vitest';
import { parseClientMessage, parseServerMessage } from './protocol.js';

const json = (value: unknown) => JSON.stringify(value);

describe('parseClientMessage', () => {
  it('accepts a valid connection request', () => {
    const message = parseClientMessage(
      json({ type: 'connect-request', targetId: '123456789', password: 'abc', viewerName: 'IT' }),
    );
    expect(message).toEqual({
      type: 'connect-request',
      targetId: '123456789',
      password: 'abc',
      viewerName: 'IT',
    });
  });

  it('accepts an ICE candidate signal', () => {
    const message = parseClientMessage(
      json({ type: 'signal', data: { candidate: { candidate: 'candidate:1 1 udp ...' } } }),
    );
    expect(message?.type).toBe('signal');
  });

  it('rejects invalid JSON', () => {
    expect(parseClientMessage('{not json')).toBeNull();
  });

  it('rejects unknown message types', () => {
    expect(parseClientMessage(json({ type: 'hack-the-server' }))).toBeNull();
  });

  it('rejects a request with an invalid target ID', () => {
    expect(
      parseClientMessage(
        json({ type: 'connect-request', targetId: '12', password: 'abc', viewerName: 'IT' }),
      ),
    ).toBeNull();
  });

  it('rejects oversized fields', () => {
    expect(
      parseClientMessage(
        json({
          type: 'connect-request',
          targetId: '123456789',
          password: 'x'.repeat(65),
          viewerName: 'IT',
        }),
      ),
    ).toBeNull();
  });

  it('trims the viewer name and rejects a blank one', () => {
    const base = { type: 'connect-request', targetId: '123456789', password: 'abc' };
    expect(parseClientMessage(json({ ...base, viewerName: '  IT  ' }))).toMatchObject({
      viewerName: 'IT',
    });
    expect(parseClientMessage(json({ ...base, viewerName: '   ' }))).toBeNull();
  });
});

describe('parseServerMessage', () => {
  it('accepts a rejection with a known reason code', () => {
    expect(parseServerMessage(json({ type: 'rejected', reason: 'busy' }))).toEqual({
      type: 'rejected',
      reason: 'busy',
    });
  });

  it('rejects an unknown reason code', () => {
    expect(parseServerMessage(json({ type: 'rejected', reason: 'because' }))).toBeNull();
  });
});
