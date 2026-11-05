import express from 'express';
import cors from 'cors';
import { corsOptions } from './config/cors.js';
import { localOnlyMiddleware } from './middleware/security.middleware.js';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware.js';
import workspaceRoutes from './features/workspace/workspace.routes.js';
import processRoutes from './features/process/process.routes.js';

export const createApp = () => {
  const app = express();

  // Basic request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Security: local loopback isolation and local origin enforcement
  app.use(localOnlyMiddleware);

  // CORS configured for local origins
  app.use(cors(corsOptions));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      agent: 'Devnest Local Agent',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // Workspace and File API routes
  app.use('/api', workspaceRoutes);

  // Process Execution API routes
  app.use('/api/process', processRoutes);

  // Unmatched route handling
  app.use(notFoundMiddleware);

  // Centralized JSON error handling
  app.use(errorMiddleware);

  return app;
};

export const app = createApp();
export default app;

