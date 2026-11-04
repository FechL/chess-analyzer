import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
const options = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
export const SESSION_SECONDS = 30 * 24 * 60 * 60;
export const digest = value => createHash('sha256').update(value).digest('hex');
export function credentials(input, { login = false } = {}) {
  const username = typeof input.username === 'string' ? input.username.trim() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) throw failure(400, 'USERNAME_INVALID');
  if (login) {
    if (!password.length || password.length > 128) throw failure(401, 'CREDENTIALS_INVALID');
  } else if (password.length < 6 || password.length > 128) throw failure(400, 'PASSWORD_INVALID');
  return { username, password };
}
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await derive(password, salt, 64, options);
  return `scrypt$131072$8$1$${salt}$${hash.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  const parts = stored?.split('$') || [];
  if (parts.length !== 6 || parts.slice(0, 4).join('$') !== 'scrypt$131072$8$1' || !/^[a-f0-9]{32}$/.test(parts[4]) || !/^[a-f0-9]{128}$/.test(parts[5])) return false;
  const actual = await derive(password, parts[4], 64, options);
  return timingSafeEqual(actual, Buffer.from(parts[5], 'hex'));
}
export function newSession() {
  const token = randomBytes(32).toString('hex');
  return { token, hash: digest(token), expires: new Date(Date.now() + SESSION_SECONDS * 1000) };
}
export function sessionToken(request) {
  const cookies = request.headers.cookie || '';
  return cookies.split(';').map(value => value.trim()).find(value => value.startsWith('kuda_session='))?.slice(13);
}
export function sessionCookie(token, secure, maxAge = SESSION_SECONDS) {
  return `kuda_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}
export function failure(status, code) { return Object.assign(new Error(code), { status, code }); }
export function publicUser(row) {
  return { id: row.id, username: row.username, displayName: row.display_name, bio: row.bio, createdAt: row.created_at, updatedAt: row.updated_at };
}
