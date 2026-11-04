import { createPool, migrate } from './db.mjs';
import { config } from './config.mjs';
import { createApi } from './app.mjs';

const pool = createPool();
pool.on('error', error => console.error('Database connection:', error.message));
try {
  await migrate(pool);
  await pool.query('DELETE FROM sessions WHERE expires_at <= now()');
  const api = createApi(pool);
  api.listen(config.port, config.host, () => console.log(`Kuda API: http://${config.host}:${config.port}`));
  api.on('error', error => { console.error(error.message); process.exitCode = 1; void pool.end(); });
  const stop = () => { api.close(() => { void pool.end(); }); api.closeIdleConnections(); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
} catch (error) {
  console.error('Cannot start the API:', error.message);
  await pool.end();
  process.exitCode = 1;
}
