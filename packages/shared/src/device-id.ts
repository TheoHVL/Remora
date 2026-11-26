import type { DeviceId } from './index.js';

/** Un ID de poste valide est composé d'exactement 9 chiffres. */
export function isValidDeviceId(value: string): value is DeviceId {
  return /^\d{9}$/.test(value);
}

/** Affiche un ID par groupes de 3 chiffres : "123456789" -> "123 456 789". */
export function formatDeviceId(id: DeviceId): string {
  return `${id.slice(0, 3)} ${id.slice(3, 6)} ${id.slice(6)}`;
}

/** Retire les espaces saisis par l'utilisateur : " 123 456 789 " -> "123456789". */
export function normalizeDeviceId(input: string): string {
  return input.replace(/\s/g, '');
}
