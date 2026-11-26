import type { DeviceId } from './index.js';

/** A valid device ID is made of exactly 9 digits. */
export function isValidDeviceId(value: string): value is DeviceId {
  return /^\d{9}$/.test(value);
}

/** Displays an ID in groups of 3 digits: "123456789" -> "123 456 789". */
export function formatDeviceId(id: DeviceId): string {
  return `${id.slice(0, 3)} ${id.slice(3, 6)} ${id.slice(6)}`;
}

/** Removes whitespace typed by the user: " 123 456 789 " -> "123456789". */
export function normalizeDeviceId(input: string): string {
  return input.replace(/\s/g, '');
}
