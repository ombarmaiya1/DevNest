import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import * as projectController from './project.controller.js';

const router = Router();

// All project routes require authentication
router.use(authenticate);

router.post('/', projectController.createProject);
router.get('/', projectController.listProjects);
router.get('/:id', projectController.getProject);
router.patch('/:id', projectController.renameProject);
router.delete('/:id', projectController.deleteProject);

export default router;

