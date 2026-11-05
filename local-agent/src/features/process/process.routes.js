import { Router } from 'express';
import { processController } from './process.controller.js';

const router = Router();

router.post('/start', processController.start);
router.post('/stop', processController.stop);
router.get('/status', processController.getStatus);
router.get('/logs', processController.getLogs);

export default router;

