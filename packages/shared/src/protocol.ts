import { z } from 'zod';
import { isValidDeviceId } from './device-id.js';

/**
 * Signaling protocol between the desktop apps and the server.
 * Every message is a JSON object with a `type` field.
 */

const deviceIdSchema = z.string().refine(isValidDeviceId, 'Invalid device ID');

/** WebRTC data relayed as-is between the two peers: a session description or an ICE candidate. */
const signalDataSchema = z.union([
  z.object({
    sdp: z.object({
      type: z.enum(['offer', 'answer']),
      sdp: z.string().max(100_000),
    }),
  }),
  z.object({
    candidate: z.object({
      candidate: z.string().max(1_000),
      sdpMid: z.string().max(100).nullish(),
      sdpMLineIndex: z.number().int().nonnegative().nullish(),
      usernameFragment: z.string().max(100).nullish(),
    }),
  }),
]);

/** Why a connection request was refused. Codes, not sentences, so the UI can translate them. */
export const rejectReasonSchema = z.enum([
  'unknown-device', // no host with this ID is online
  'wrong-password',
  'busy', // the host is already in a session
  'declined', // the host user clicked "Decline"
  'timeout', // the host user did not answer in time
  'rate-limited', // too many attempts
  'host-disconnected',
]);

// ---------- App -> server ----------

export const clientMessageSchema = z.discriminatedUnion('type', [
  /** Ask for a public ID so that this device can be reached. */
  z.object({ type: z.literal('register-host') }),
  /** Viewer asks to control the device `targetId`. */
  z.object({
    type: z.literal('connect-request'),
    targetId: deviceIdSchema,
    password: z.string().min(1).max(64),
    viewerName: z.string().trim().min(1).max(64),
  }),
  /** Host answers a pending connection request. */
  z.object({
    type: z.literal('connect-response'),
    accepted: z.boolean(),
    reason: rejectReasonSchema.optional(),
  }),
  /** Viewer gives up on its pending request. */
  z.object({ type: z.literal('cancel-request') }),
  /** WebRTC data for the other peer of the session. */
  z.object({ type: z.literal('signal'), data: signalDataSchema }),
  /** Either peer ends the session. */
  z.object({ type: z.literal('end-session') }),
]);

// ---------- Server -> app ----------

export const serverMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('registered'), id: deviceIdSchema }),
  /** Sent to the host: someone wants to take control. The host checks the password itself. */
  z.object({
    type: z.literal('connect-request'),
    password: z.string(),
    viewerName: z.string(),
  }),
  z.object({ type: z.literal('request-cancelled') }),
  z.object({ type: z.literal('accepted') }),
  z.object({ type: z.literal('rejected'), reason: rejectReasonSchema }),
  z.object({ type: z.literal('signal'), data: signalDataSchema }),
  z.object({ type: z.literal('session-ended') }),
]);

export type SignalData = z.infer<typeof signalDataSchema>;
export type RejectReason = z.infer<typeof rejectReasonSchema>;
export type ClientMessage = z.infer<typeof clientMessageSchema>;
export type ServerMessage = z.infer<typeof serverMessageSchema>;

/** Parses a raw WebSocket message. Returns `null` if it is not valid JSON or not a known message. */
function parseWith<T>(schema: z.ZodType<T>, raw: string): T | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = schema.safeParse(json);
  return result.success ? result.data : null;
}

export function parseClientMessage(raw: string): ClientMessage | null {
  return parseWith(clientMessageSchema, raw);
}

export function parseServerMessage(raw: string): ServerMessage | null {
  return parseWith(serverMessageSchema, raw);
}
