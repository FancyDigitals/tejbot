import crypto from 'crypto';

const COOKIE_NAME = 'tejbot_session';

function getSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error('AUTH_SECRET is missing');
  }

  return secret;
}

function sign(value) {
  return crypto
    .createHmac('sha256', getSecret())
    .update(value)
    .digest('hex');
}

export function createSessionToken() {
  const payload = `authenticated:${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token) {
  if (!token) return false;

  const separator = token.lastIndexOf('.');
  if (separator === -1) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expected = sign(payload);

  if (signature.length !== expected.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

export function getSessionCookieName() {
  return COOKIE_NAME;
}