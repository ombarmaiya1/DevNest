import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import * as fileController from './file.controller.js';

const router = Router();

// Project-scoped file routes
router.get('/projects/:projectId/files', authenticate, fileController.listFiles);
router.post('/projects/:projectId/files', authenticate, fileController.createFile);

// Direct file routes
router.get('/files/:fileId', authenticate, fileController.getFile);
router.patch('/files/:fileId', authenticate, fileController.updateFile);
router.delete('/files/:fileId', authenticate, fileController.deleteFile);

export default router;
