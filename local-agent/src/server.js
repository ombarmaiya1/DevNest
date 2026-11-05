import { app } from './app.js';
import { env } from './config/env.js';
import { processService } from './features/process/process.service.js';

let server = null;

export const startServer = (port = env.PORT, host = env.HOST) => {
  return new Promise((resolve, reject) => {
    try {
      server = app.listen(port, host, () => {
        const address = server.address();
        console.log(`[Devnest Local Agent] Running on http://${host}:${address.port}`);
        resolve(server);
      });

      server.on('error', (err) => {
        console.error('[Devnest Local Agent] Server startup error:', err);
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
};

export const stopServer = async () => {
  // Terminate any active workspace process
  try {
    await processService.stopProcess();
  } catch (err) {
    console.error('[Devnest Local Agent] Error terminating active process during shutdown:', err);
  }

  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('[Devnest Local Agent] Server stopped gracefully.');
        server = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
};

// Graceful shutdown handlers
const handleShutdown = async (signal) => {
  console.log(`\n[Devnest Local Agent] Received ${signal}. Shutting down gracefully...`);
  await stopServer();
  process.exit(0);
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

// If executed directly from CLI: node src/server.js
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  startServer().catch((err) => {
    console.error('[Devnest Local Agent] Fatal startup error:', err);
    process.exit(1);
  });
}

