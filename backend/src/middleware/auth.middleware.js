import { createSupabaseClient } from '../config/supabase.js';

/**
 * Authentication middleware for Express.
 *
 * Responsibilities:
 * 1. Extracts Bearer token from the Authorization header.
 * 2. Rejects missing or malformed tokens with a 401 status.
 * 3. Creates an isolated Supabase client using createSupabaseClient(token).
 * 4. Verifies the token using supabaseClient.auth.getUser(token).
 * 5. Rejects invalid or expired tokens with a 401 status.
 * 6. Attaches the verified user to req.user and the client to req.supabase.
 * 7. Forwards unexpected errors to centralized error handling.
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Authorization header is required',
      });
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token || !token.trim()) {
      return res.status(401).json({
        success: false,
        message: 'Malformed authorization header. Expected: Bearer <token>',
      });
    }

    const trimmedToken = token.trim();
    const supabaseClient = createSupabaseClient(trimmedToken);

    const {
      data: { user },
      error,
    } = await supabaseClient.auth.getUser(trimmedToken);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: error?.message || 'Invalid or expired token',
      });
    }

    req.user = user;
    req.supabase = supabaseClient;

    next();
  } catch (error) {
    next(error);
  }
};

export const authMiddleware = authenticate;

