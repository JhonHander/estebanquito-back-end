import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { showTotalIncome } from '../controllers/controller.report.js';
import { showTotalOutcome } from '../controllers/controller.report.js';
import { showTotalDebts } from '../controllers/controller.report.js';

const router = Router();

router.post('/api/reportTotalIncome', authMiddleware, showTotalIncome)
router.post('/api/reportTotalOutcome', authMiddleware, showTotalOutcome)
router.post('/api/reportTotalDebts', authMiddleware, showTotalDebts)

export default router;