import { getUserByAccountNumber } from '../controllers/controller.user.js';
import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { updateUserByAccountNumber } from '../controllers/controller.user.js';

const router = Router();
router.post('/api/getUserByAccountNumber', authMiddleware, getUserByAccountNumber); //ruta protegida

router.put('/api/updateUserByAccountNumber', authMiddleware, updateUserByAccountNumber); //ruta protegida


export default router;