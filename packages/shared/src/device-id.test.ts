import { describe, expect, it } from 'vitest';
import { formatDeviceId, isValidDeviceId, normalizeDeviceId } from './device-id.js';

describe('isValidDeviceId', () => {
  it('accepte exactement 9 chiffres', () => {
    expect(isValidDeviceId('123456789')).toBe(true);
  });

  it('refuse les IDs trop courts ou trop longs', () => {
    expect(isValidDeviceId('12345678')).toBe(false);
    expect(isValidDeviceId('1234567890')).toBe(false);
  });

  it('refuse les caractères non numériques', () => {
    expect(isValidDeviceId('12345678a')).toBe(false);
    expect(isValidDeviceId('123 456 789')).toBe(false);
    expect(isValidDeviceId('')).toBe(false);
  });
});

describe('formatDeviceId', () => {
  it('groupe les chiffres par 3', () => {
    expect(formatDeviceId('123456789')).toBe('123 456 789');
  });
});

describe('normalizeDeviceId', () => {
  it('retire tous les espaces', () => {
    expect(normalizeDeviceId(' 123 456  789 ')).toBe('123456789');
  });

  it('rend un ID formaté de nouveau valide', () => {
    expect(isValidDeviceId(normalizeDeviceId(formatDeviceId('987654321')))).toBe(true);
  });
});
