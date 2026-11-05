import { Router } from 'express';
import { workspaceController } from './workspace.controller.js';

const router = Router();

// Workspace Selection Endpoints
router.post('/workspace/select', workspaceController.selectWorkspace);
router.get('/workspace', workspaceController.getWorkspace);

// File Operations Endpoints
router.get('/files', workspaceController.listFiles);
router.get('/files/content', workspaceController.readFile);
router.put('/files/content', workspaceController.writeFile);

export default router;

