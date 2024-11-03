import jwt from 'jsonwebtoken';
import config from '../config.js';

export const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extrae el token

    if (!token) {
        return res.status(401).json({ message: 'Token no proporcionado' });
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret); // Verifica el token
        req.user = decoded; // Guarda los datos decodificados en `req.user`
        next();
    } catch (error) {
        console.error(error);
        res.status(401).json({ message: 'Token inválido o expirado' });
    }
};