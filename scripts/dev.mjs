import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { ensureDevEnv, projectRoot as root } from './env.mjs';
ensureDevEnv();
const children = new Set();
let stopping = false;
function run(command, args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit', env: process.env });
    children.add(child);
    child.once('error', reject);
    child.once('exit', code => {
      children.delete(child);
      code === 0 ? resolveRun() : reject(new Error(`${command} exited with code ${code}`));
    });
  });
}
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
  console.log('\nDevelopment servers stopped. PostgreSQL is kept running; npm run db:down stops it without deleting data.');
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
async function availablePort(port) {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', () => reject(new Error(`Port ${port} is in use. Stop the old development server or change .env.`)));
    probe.listen(Number(port), '127.0.0.1', resolve);
  });
  await new Promise(resolve => probe.close(resolve));
}
try {
  await availablePort(process.env.API_PORT || 3001);
  await availablePort(process.env.DEV_PORT || 5173);
  await run('docker', ['compose', 'up', '-d', '--wait', 'db']);
  if (!stopping) {
    await run(process.execPath, ['server/migrate.mjs']);
    const api = run(process.execPath, ['--watch', 'server/index.mjs']);
    let bootError;
    api.catch(error => { bootError = error; });
    let healthy = false;
    for (let attempt = 0; attempt < 80 && !stopping; attempt++) {
      if (bootError) throw bootError;
      try {
        const response = await fetch(`http://127.0.0.1:${process.env.API_PORT || 3001}/api/health`, { signal: AbortSignal.timeout(1000) });
        if (response.ok) { healthy = true; break; }
      } catch { /* Wait for the API process to finish booting. */ }
      await delay(250);
    }
    if (!healthy) throw new Error('The API did not become ready.');
    const servers = [api,
      run(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', process.env.DEV_PORT || '5173']),
    ];
    await Promise.race(servers);
    stop();
    await Promise.allSettled(servers);
  }
} catch (error) {
  if (!stopping) {
    console.error(`\nCannot start Kuda: ${error.message}\nCheck Docker access, database credentials, and the development ports.`);
    stop(1);
  }
}
