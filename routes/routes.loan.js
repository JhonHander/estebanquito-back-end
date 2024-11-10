import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { askForLoan } from '../controllers/controller.loan.js';


const router = Router();

router.post('/api/askForLoan', authMiddleware, askForLoan)

export default router;