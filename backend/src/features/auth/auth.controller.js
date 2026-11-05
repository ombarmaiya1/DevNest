/**
 * Retrieves the currently authenticated user's profile information.
 *
 * Requirements:
 * - Requires authentication middleware.
 * - Returns authenticated user's ID, email, and available basic profile metadata.
 * - Never exposes access tokens or refresh tokens.
 */
export const getMe = async (req, res, next) => {
  try {
    const user = req.user;

    const profile = {
      id: user.id,
      email: user.email,
      phone: user.phone || null,
      metadata: user.user_metadata || {},
      appMetadata: user.app_metadata || {},
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

