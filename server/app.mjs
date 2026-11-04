import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { config } from './config.mjs';
import { transaction } from './db.mjs';
import { credentials, digest, failure, hashPassword, newSession, publicUser, sessionCookie, sessionToken, verifyPassword } from './security.mjs';

const LIMIT = 16 * 1024 * 1024;
const INTERNAL_KEY = /^kuda-(auth-|sync-|legacy-)/;
export function validateChanges(changes) {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes) || Object.keys(changes).length > 2000) throw failure(400, 'STATE_INVALID');
  for (const [key, value] of Object.entries(changes)) {
    if (key.length > 120 || !/^kuda-[a-zA-Z0-9_.:*+-]+$/.test(key) || INTERNAL_KEY.test(key) || (value !== null && typeof value !== 'string') || (typeof value === 'string' && Buffer.byteLength(value) > 8 * 1024 * 1024)) throw failure(400, 'STATE_INVALID');
  }
  return changes;
}
async function body(request) {
  if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) throw failure(415, 'JSON_REQUIRED');
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > LIMIT) throw failure(413, 'BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString());
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw failure(400, 'JSON_INVALID'); }
}
export function createApi(pool, settings = config) {
  const limits = new Map();
  let activeHashes = 0;
  const authCost = async action => {
    if (activeHashes >= 2) throw failure(429, 'TRY_LATER');
    activeHashes++;
    try { return await action(); } finally { activeHashes--; }
  };
  const rateLimit = key => {
    const now = Date.now();
    if (limits.size > 2000) for (const [name, value] of limits) if (value.until < now) limits.delete(name);
    const item = limits.get(key);
    if (item && item.until > now && item.count >= 40) throw failure(429, 'TRY_LATER');
    limits.set(key, !item || item.until <= now ? { count: 1, until: now + 10 * 60 * 1000 } : { ...item, count: item.count + 1 });
  };
  const json = (response, status, value, headers = {}) => {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
    response.end(JSON.stringify(value));
  };
  const authenticate = async request => {
    const token = sessionToken(request);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const result = await pool.query('SELECT u.*, s.token_hash FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > now()', [digest(token)]);
    return result.rows[0] || null;
  };
  const startSession = async (client, userId) => {
    const session = newSession();
    await client.query('INSERT INTO sessions(token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [session.hash, userId, session.expires]);
    return session;
  };
  const applyChanges = async (client, userId, changes, importOnly = false) => {
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) {
        if (!importOnly) await client.query('DELETE FROM user_state WHERE user_id = $1 AND key = $2', [userId, key]);
      } else {
        const conflict = importOnly ? 'DO NOTHING' : 'DO UPDATE SET value = EXCLUDED.value, updated_at = now()';
        await client.query(`INSERT INTO user_state(user_id, key, value) VALUES ($1, $2, $3) ON CONFLICT (user_id, key) ${conflict}`, [userId, key, value]);
      }
    }
  };
  return createServer(async (request, response) => {
    try {
      const path = new URL(request.url, 'http://localhost').pathname;
      const method = request.method;
      if (!path.startsWith('/api/')) throw failure(404, 'NOT_FOUND');
      if (!['GET', 'HEAD'].includes(method)) {
        if (request.headers.origin && !settings.origins.has(request.headers.origin)) throw failure(403, 'ORIGIN_INVALID');
        if (request.headers['x-kuda-request'] !== '1') throw failure(403, 'REQUEST_INVALID');
      }
      if (method === 'GET' && path === '/api/health') {
        await pool.query('SELECT 1');
        return json(response, 200, { ok: true });
      }
      if (method === 'POST' && ['/api/auth/register', '/api/auth/login'].includes(path)) {
        rateLimit(request.socket.remoteAddress || 'local');
        const input = await body(request);
        const { username, password } = credentials(input, { login: path.endsWith('/login') });
        if (path.endsWith('/register')) {
          const passwordHash = await authCost(() => hashPassword(password));
          const result = await transaction(pool, async client => {
            const inserted = await client.query('INSERT INTO users(id, username, password_hash, display_name) VALUES ($1, $2, $3, $4) RETURNING *', [randomUUID(), username, passwordHash, username]);
            const user = inserted.rows[0];
            return { user, session: await startSession(client, user.id) };
          });
          return json(response, 201, { user: publicUser(result.user) }, { 'Set-Cookie': sessionCookie(result.session.token, settings.secureCookies) });
        }
        const result = await pool.query('SELECT * FROM users WHERE lower(username) = lower($1)', [username]);
        const user = result.rows[0];
        const valid = await authCost(async () => {
          if (!user) { await hashPassword(password); return false; }
          return verifyPassword(password, user.password_hash);
        });
        if (!valid) throw failure(401, 'CREDENTIALS_INVALID');
        const session = await startSession(pool, user.id);
        return json(response, 200, { user: publicUser(user) }, { 'Set-Cookie': sessionCookie(session.token, settings.secureCookies) });
      }
      const user = await authenticate(request);
      if (method === 'GET' && path === '/api/auth/me') return json(response, 200, { user: user ? publicUser(user) : null });
      if (!user) throw failure(401, 'AUTH_REQUIRED');
      if (request.headers['x-kuda-user'] && request.headers['x-kuda-user'] !== user.id) throw failure(409, 'ACCOUNT_CHANGED');
      if (method === 'POST' && path === '/api/auth/logout') {
        await pool.query('DELETE FROM sessions WHERE token_hash = $1', [user.token_hash]);
        return json(response, 200, { ok: true }, { 'Set-Cookie': sessionCookie('', settings.secureCookies, 0) });
      }
      if (method === 'GET' && path === '/api/state') {
        const rows = await pool.query('SELECT key, value FROM user_state WHERE user_id = $1 ORDER BY key', [user.id]);
        return json(response, 200, { userId: user.id, values: Object.fromEntries(rows.rows.map(row => [row.key, row.value])) });
      }
      if ((method === 'PATCH' && path === '/api/state') || (method === 'POST' && path === '/api/state/import')) {
        const input = await body(request);
        if (input.userId !== user.id) throw failure(409, 'ACCOUNT_CHANGED');
        const changes = validateChanges(input.changes);
        const importing = method === 'POST';
        const imported = await transaction(pool, async client => {
          // Serialize imports and writes for the same account.
          await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [user.id]);
          if (importing) {
            const inserted = await client.query('INSERT INTO user_imports(user_id, kind) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING user_id', [user.id, 'browser-v1']);
            if (!inserted.rowCount) return false;
          }
          await applyChanges(client, user.id, changes, importing);
          return true;
        });
        return json(response, 200, { ok: true, imported });
      }
      if (method === 'PATCH' && path === '/api/profile') {
        const input = await body(request);
        const username = typeof input.username === 'string' ? input.username.trim() : user.username;
        const displayName = typeof input.displayName === 'string' ? input.displayName.trim() : user.display_name;
        const bio = typeof input.bio === 'string' ? input.bio.trim() : user.bio;
        if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) throw failure(400, 'USERNAME_INVALID');
        if (displayName.length > 60 || bio.length > 500) throw failure(400, 'PROFILE_INVALID');
        const updated = await pool.query('UPDATE users SET username = $1, display_name = $2, bio = $3, updated_at = now() WHERE id = $4 RETURNING *', [username, displayName, bio, user.id]);
        return json(response, 200, { user: publicUser(updated.rows[0]) });
      }
      if (method === 'POST' && path === '/api/profile/password') {
        rateLimit(request.socket.remoteAddress || 'local');
        const input = await body(request);
        const current = typeof input.currentPassword === 'string' ? input.currentPassword : '';
        const next = typeof input.newPassword === 'string' ? input.newPassword : '';
        if (current.length > 128 || next.length < 6 || next.length > 128) throw failure(400, 'PASSWORD_INVALID');
        const passwordHash = await authCost(async () => {
          if (!(await verifyPassword(current, user.password_hash))) throw failure(400, 'CURRENT_PASSWORD_INVALID');
          return hashPassword(next);
        });
        const session = await transaction(pool, async client => {
          await client.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [passwordHash, user.id]);
          await client.query('DELETE FROM sessions WHERE user_id = $1', [user.id]);
          return startSession(client, user.id);
        });
        return json(response, 200, { ok: true }, { 'Set-Cookie': sessionCookie(session.token, settings.secureCookies) });
      }
      throw failure(404, 'NOT_FOUND');
    } catch (error) {
      if (response.headersSent) { response.end(); return; }
      if (error.code === '23505') return json(response, 409, { error: 'USERNAME_TAKEN' });
      if (!error.status) console.error('API error:', error.message);
      json(response, error.status || 500, { error: error.status ? error.code : 'SERVER_ERROR' });
    }
  });
}
