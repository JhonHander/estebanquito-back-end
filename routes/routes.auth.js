import { register, login } from '../controllers/controller.auth.js';
import { Router } from 'express';

const router = Router();

router.post('/api/register', register);

router.post('/api/login', login);

export default router;