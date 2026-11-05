import { env } from './env.js';

export const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. curl, test runners without origin header)
    if (!origin) {
      return callback(null, true);
    }

    try {
      const parsed = new URL(origin);
      const isLocalhost =
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.hostname === '::1';

      if (isLocalhost || env.ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      const err = new Error(`CORS blocked for origin: ${origin}`);
      err.statusCode = 403;
      return callback(err);
    } catch {
      const err = new Error('Invalid origin format');
      err.statusCode = 400;
      return callback(err);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
};

