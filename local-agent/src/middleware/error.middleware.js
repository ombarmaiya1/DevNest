/**
 * Centralized error handling middleware returning consistent JSON errors.
 */
export const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  // If headers have already been sent, delegate to default express error handler
  if (res.headersSent) {
    return next(err);
  }

  return res.status(statusCode).json({
    success: false,
    error: err.message || 'An unexpected error occurred in the local agent',
    ...(process.env.NODE_ENV === 'development' && statusCode === 500 ? { stack: err.stack } : {}),
  });
};

/**
 * 404 Not Found fallback middleware.
 */
export const notFoundMiddleware = (req, res) => {
  return res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

