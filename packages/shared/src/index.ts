/** Version of the protocol spoken between the apps and the server. */
export const PROTOCOL_VERSION = 1;

/** Public device identifier: 9 digits, e.g. "123456789". */
export type DeviceId = string;

export { formatDeviceId, isValidDeviceId, normalizeDeviceId } from './device-id.js';
