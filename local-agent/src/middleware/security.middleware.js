import { env } from '../config/env.js';

/**
 * Local IP verification helper.
 * Normalizes IPv4 and IPv6 loopback addresses.
 */
export const isLocalIp = (ip) => {
  if (!ip) return false;
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip === 'localhost'
  );
};

/**
 * Security middleware enforcing local-only execution and origin restrictions.
 */
export const localOnlyMiddleware = (req, res, next) => {
  const remoteIp = req.socket?.remoteAddress;

  // 1. Verify that request originates strictly from loopback
  if (!isLocalIp(remoteIp)) {
    return res.status(403).json({
      success: false,
      error: `Forbidden: Remote access denied for IP ${remoteIp}. The local agent only accepts connections from 127.0.0.1.`,
    });
  }

  // 2. Reject non-local origins if an Origin header is provided (e.g. CSRF / DNS rebinding attempts)
  const origin = req.headers.origin;
  if (origin) {
    try {
      const parsed = new URL(origin);
      const isLocalHost =
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.hostname === '::1';

      if (!isLocalHost && !env.ALLOWED_ORIGINS.includes(origin)) {
        return res.status(403).json({
          success: false,
          error: `Forbidden: Non-local origin rejected: ${origin}`,
        });
      }
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Malformed Origin header',
      });
    }
  }

  next();
};

