import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createApp } from './app.js';

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch (cwdError) {
    if (cwdError?.code === 'ENOENT') {
      try {
        const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
        process.loadEnvFile(resolve(projectRoot, '.env'));
      } catch (rootError) {
        if (rootError?.code !== 'ENOENT') {
          throw rootError;
        }
      }
    } else {
      throw cwdError;
    }
  }
}

function readPort(portValue) {
  if (portValue === undefined || portValue === '') {
    return 3000;
  }

  const port = Number(portValue);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  return port;
}

const port = readPort(process.env.PORT);
const host = process.env.HOST || '127.0.0.1';
const server = createApp();

server.on('error', (error) => {
  console.error(`Unable to start the DocGuard AI backend on ${host}:${port}:`, error);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`DocGuard AI backend listening on ${host}:${port}.`);
});
