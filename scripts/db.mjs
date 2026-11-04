import { spawn } from 'node:child_process';
import { ensureDevEnv, projectRoot } from './env.mjs';
ensureDevEnv();
const child = spawn('docker', ['compose', ...process.argv.slice(2)], { cwd: projectRoot, stdio: 'inherit', env: process.env });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
