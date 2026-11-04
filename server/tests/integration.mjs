import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createPool, migrate } from '../db.mjs';
import { createApi } from '../app.mjs';

// Uses its own temporary schema; never resets the application's tables.
test('PostgreSQL accounts, sessions, profile and isolated state', async t => {
  const admin = createPool();
  const schema = `test_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = createPool({ options: `-c search_path=${schema}` });
  const server = createApi(pool);
  let base;
  try {
    await migrate(pool);
    await migrate(pool);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM schema_migrations')).rows[0].n, 1);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    base = `http://127.0.0.1:${server.address().port}/api`;
    const request = async (path, method = 'GET', body, cookie, extraHeaders = {}) => {
      const response = await fetch(`${base}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-Kuda-Request': '1', ...(cookie ? { Cookie: cookie } : {}), ...extraHeaders },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0], headers: response.headers };
    };
    const password = 'abc123';
    let alice, bob;
    await t.test('unauthenticated state is inaccessible', async () => {
      assert.equal((await request('/state')).status, 401);
      assert.equal((await request('/auth/me')).data.user, null);
    });
    await t.test('registers unique case-insensitive usernames and hashes passwords', async () => {
      const short = await request('/auth/register', 'POST', { username: 'Short', password: 'abc12' });
      assert.equal(short.status, 400);
      assert.equal(short.data.error, 'PASSWORD_INVALID');
      alice = await request('/auth/register', 'POST', { username: 'Alice', password });
      assert.equal(alice.status, 201);
      assert.equal(alice.data.user.username, 'Alice');
      assert.ok(alice.headers.get('set-cookie').includes('HttpOnly'));
      assert.ok(alice.headers.get('set-cookie').includes('SameSite=Strict'));
      assert.equal(alice.data.user.password_hash, undefined);
      const stored = (await pool.query('SELECT password_hash FROM users WHERE id = $1', [alice.data.user.id])).rows[0].password_hash;
      assert.ok(stored.startsWith('scrypt$131072$8$1$'));
      assert.ok(!stored.includes(password));
      const duplicate = await request('/auth/register', 'POST', { username: 'alice', password });
      assert.equal(duplicate.status, 409);
      assert.equal(duplicate.data.error, 'USERNAME_TAKEN');
      bob = await request('/auth/register', 'POST', { username: 'Bob', password });
      assert.equal(bob.status, 201);
    });
    await t.test('validates credentials and restores sessions', async () => {
      assert.equal((await request('/auth/login', 'POST', { username: 'Alice', password: 'incorrect-password' })).status, 401);
      const shortWrong = await request('/auth/login', 'POST', { username: 'Alice', password: 'bad' });
      assert.equal(shortWrong.status, 401);
      assert.equal(shortWrong.data.error, 'CREDENTIALS_INVALID');
      const login = await request('/auth/login', 'POST', { username: 'ALICE', password });
      assert.equal(login.status, 200);
      assert.equal((await request('/auth/me', 'GET', undefined, login.cookie)).data.user.id, alice.data.user.id);
    });
    await t.test('migrates legacy state once, preserving raw sound values and existing state', async () => {
      const payload = { userId: alice.data.user.id, changes: { 'kuda-library': '[{"event":"Legacy game"}]', 'kuda-board-sound': 'off', 'kuda-session': '{"moves":["e4"]}' } };
      assert.equal((await request('/state/import', 'POST', payload, alice.cookie)).data.imported, true);
      payload.changes['kuda-library'] = '[]';
      assert.equal((await request('/state/import', 'POST', payload, alice.cookie)).data.imported, false);
      const state = (await request('/state', 'GET', undefined, alice.cookie)).data.values;
      assert.equal(state['kuda-library'], '[{"event":"Legacy game"}]');
      assert.equal(state['kuda-board-sound'], 'off');
    });
    await t.test('persists per-key changes and prevents cross-account access', async () => {
      const changed = await request('/state', 'PATCH', { userId: alice.data.user.id, changes: { 'kuda-notes': '{"fen":"Study this position"}', 'kuda-settings': '{"language":"en"}' } }, alice.cookie);
      assert.equal(changed.status, 200);
      assert.equal((await request('/state', 'GET', undefined, alice.cookie)).data.values['kuda-notes'], '{"fen":"Study this position"}');
      assert.deepEqual((await request('/state', 'GET', undefined, bob.cookie)).data.values, {});
      assert.equal((await request('/state', 'PATCH', { userId: alice.data.user.id, changes: {} }, bob.cookie)).status, 409);
      assert.equal((await request('/state', 'GET', undefined, bob.cookie, { 'X-Kuda-User': alice.data.user.id })).status, 409);
      assert.equal((await request('/state', 'PATCH', { userId: alice.data.user.id, changes: { 'kuda-auth-user': 'other' } }, alice.cookie)).status, 400);
    });
    await t.test('rejects cross-origin writes', async () => {
      assert.equal((await request('/state', 'PATCH', { userId: alice.data.user.id, changes: {} }, alice.cookie, { Origin: 'https://untrusted.example' })).status, 403);
    });
    await t.test('updates profiles and enforces unique usernames on edits', async () => {
      const update = await request('/profile', 'PATCH', { username: 'Alice_Chess', displayName: 'Alice', bio: 'Learning openings.' }, alice.cookie);
      assert.equal(update.status, 200);
      assert.equal(update.data.user.bio, 'Learning openings.');
      assert.equal((await request('/profile', 'PATCH', { username: 'bob' }, alice.cookie)).status, 409);
    });
    await t.test('changes passwords, revokes old sessions and supports logout', async () => {
      const wrong = await request('/profile/password', 'POST', { currentPassword: 'incorrect-password', newPassword: 'new123' }, alice.cookie);
      assert.equal(wrong.status, 400);
      const update = await request('/profile/password', 'POST', { currentPassword: password, newPassword: 'new123' }, alice.cookie);
      assert.equal(update.status, 200);
      assert.equal((await request('/state', 'GET', undefined, alice.cookie)).status, 401);
      assert.equal((await request('/auth/login', 'POST', { username: 'Alice_Chess', password })).status, 401);
      const login = await request('/auth/login', 'POST', { username: 'Alice_Chess', password: 'new123' });
      assert.equal(login.status, 200);
      assert.equal((await request('/auth/logout', 'POST', {}, login.cookie)).status, 200);
      assert.equal((await request('/state', 'GET', undefined, login.cookie)).status, 401);
      assert.equal((await request('/state', 'GET', undefined, bob.cookie)).status, 200);
    });
  } finally {
    server.closeAllConnections();
    if (server.listening) await new Promise(resolve => server.close(resolve));
    await pool.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
});
