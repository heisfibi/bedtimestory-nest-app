import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

/** Hashes as "scrypt$<salt>$<hash>" (base64). */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = await scryptAsync(
    password,
    Buffer.from(salt, 'base64'),
    expected.length,
  );
  return timingSafeEqual(actual, expected);
}

// Hashed once so that unknown emails cost as much to check as known ones.
const DUMMY_HASH = hashPassword(randomBytes(16).toString('hex'));
export const verifyAgainstDummy = async (password: string) =>
  verifyPassword(password, await DUMMY_HASH);

/** A readable one-time password for new or reset accounts. */
export const temporaryPassword = () => randomBytes(9).toString('base64url');
