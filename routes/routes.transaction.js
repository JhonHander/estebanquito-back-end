import { getTransactionsByUser } from '../controllers/controller.transaction.js';
import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { transfer } from '../controllers/controller.transaction.js';
import { withdrawMoney } from '../controllers/controller.transaction.js';


const router = Router();

router.post('/api/getTransactionsByUser', authMiddleware, getTransactionsByUser); //ruta protegida
router.put('/api/transferMoney', authMiddleware, transfer); //ruta protegida
router.put('/api/withdrawMoney', authMiddleware, withdrawMoney); // ruta protegida
// router.put('/api/depositMoney', authMiddleware, depositMoney); // ruta protegida

export default router;