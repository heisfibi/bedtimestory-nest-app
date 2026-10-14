import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// The two things the server hands the app, both signed so that nothing needs
// keeping: a challenge, which Google Play signs into its integrity verdict so
// the verdict can't be one fetched for someone else; and, once the verdict is
// good, an app token the app sends with its requests until it runs out.

const MINUTE_MS = 60 * 1000;
/** How long the app has to get Play's verdict on a challenge. */
export const CHALLENGE_MS = 10 * MINUTE_MS;
/** How long a good verdict lasts before the app asks Play again. */
export const APP_TOKEN_MS = 12 * 60 * MINUTE_MS;

const b64 = (data: Buffer | string) => Buffer.from(data).toString('base64url');

/** A key of its own for this, made from the server's secret: an admin's session token is no use here, nor the other way round. */
export const keyFrom = (secret: string) =>
  createHmac('sha256', secret).update('app-integrity').digest();

const sign = (key: Buffer, text: string) =>
  createHmac('sha256', key).update(text).digest('base64url');

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** "random.expiry.signature": what the app passes to Play as the request hash. */
export function makeChallenge(key: Buffer, now = Date.now()) {
  const body = `c.${b64(randomBytes(18))}.${now + CHALLENGE_MS}`;
  return `${body}.${sign(key, body)}`;
}

export function challengeIsGood(
  key: Buffer,
  challenge: string,
  now = Date.now(),
) {
  const at = challenge.lastIndexOf('.');
  if (at < 0) return false;
  const body = challenge.slice(0, at);
  const [kind, , expiry] = body.split('.');
  return (
    kind === 'c' &&
    same(sign(key, body), challenge.slice(at + 1)) &&
    Number(expiry) > now
  );
}

/** "a.reader.expiry.signature", sent back in the X-App-Token header. */
export function makeAppToken(key: Buffer, readerId: string, now = Date.now()) {
  const body = `a.${b64(readerId)}.${now + APP_TOKEN_MS}`;
  return { token: `${body}.${sign(key, body)}`, expiresAt: now + APP_TOKEN_MS };
}

export function appTokenIsGood(key: Buffer, token: string, now = Date.now()) {
  const at = token.lastIndexOf('.');
  if (at < 0) return false;
  const body = token.slice(0, at);
  const [kind, , expiry] = body.split('.');
  return (
    kind === 'a' &&
    same(sign(key, body), token.slice(at + 1)) &&
    Number(expiry) > now
  );
}
