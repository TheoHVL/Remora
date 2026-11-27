/** No ambiguous characters (l/1, o/0...): the password is read aloud or copied by hand. */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const LENGTH = 8;

/** Random one-time password, e.g. "k7m2xq9a". */
export function generatePassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(LENGTH));
  return Array.from(bytes, (byte) => ALPHABET.charAt(byte % ALPHABET.length)).join('');
}
