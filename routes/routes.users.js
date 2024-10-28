import { getUsers } from '../controllers/controller.users.js';
import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();
router.post('/api/users', authMiddleware, getUsers); //ruta protegida
// router.get('/api/users', getUsers); //ruta no protegida

export default router;