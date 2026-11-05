import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { corsOptions } from './config/cors.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';
import authRoutes from './features/auth/auth.routes.js';
import projectRoutes from './features/projects/project.routes.js';
import fileRoutes from './features/files/file.routes.js';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors(corsOptions));

// JSON & body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    name: 'Website Builder API',
    timestamp: new Date().toISOString(),
  });
});

// Feature routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1', fileRoutes);

// 404 handler for unknown routes
app.use(notFoundHandler);

// Centralized error handling middleware
app.use(errorHandler);

export default app;
