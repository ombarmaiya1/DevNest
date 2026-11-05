import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const parsePort = (val, defaultPort = 4317) => {
  if (!val) return defaultPort;
  const parsed = parseInt(val, 10);
  if (isNaN(parsed) || parsed <= 0 || parsed > 65535) {
    console.warn(`[Config] Invalid PORT '${val}', falling back to ${defaultPort}`);
    return defaultPort;
  }
  return parsed;
};

const parseOrigins = (val) => {
  const defaults = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];
  if (!val || typeof val !== 'string') return defaults;
  const parsed = val.split(',').map((o) => o.trim()).filter(Boolean);
  return parsed.length > 0 ? parsed : defaults;
};

export const env = {
  PORT: parsePort(process.env.PORT, 4317),
  HOST: process.env.HOST || '127.0.0.1',
  NODE_ENV: process.env.NODE_ENV || 'development',
  ALLOWED_ORIGINS: parseOrigins(process.env.ALLOWED_ORIGINS),
};

