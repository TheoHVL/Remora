import { describe, expect, it } from 'vitest';
import { formatDeviceId, isValidDeviceId, normalizeDeviceId } from './device-id.js';

describe('isValidDeviceId', () => {
  it('accepts exactly 9 digits', () => {
    expect(isValidDeviceId('123456789')).toBe(true);
  });

  it('rejects IDs that are too short or too long', () => {
    expect(isValidDeviceId('12345678')).toBe(false);
    expect(isValidDeviceId('1234567890')).toBe(false);
  });

  it('rejects non-digit characters', () => {
    expect(isValidDeviceId('12345678a')).toBe(false);
    expect(isValidDeviceId('123 456 789')).toBe(false);
    expect(isValidDeviceId('')).toBe(false);
  });
});

describe('formatDeviceId', () => {
  it('groups digits by 3', () => {
    expect(formatDeviceId('123456789')).toBe('123 456 789');
  });
});

describe('normalizeDeviceId', () => {
  it('removes all whitespace', () => {
    expect(normalizeDeviceId(' 123 456  789 ')).toBe('123456789');
  });

  it('turns a formatted ID back into a valid one', () => {
    expect(isValidDeviceId(normalizeDeviceId(formatDeviceId('987654321')))).toBe(true);
  });
});
