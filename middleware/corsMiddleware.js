import cors from 'cors';

export const corsMiddleware = cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // Si estás manejando cookies o tokens
});

// export const corsMiddleware = (req, res, next) => {
//     const whitelist = ['http://localhost:3000', 'http://localhost:3001'];
//     const corsOptions = {
//         origin: (origin, callback) => {
//             if (whitelist.indexOf(origin) !== -1) {
//                 callback(null, true);
//             } else {
//                 callback(new Error('No permitido por CORS'));
//             }
//         }
//     };
//     cors(corsOptions);
//     next();
// }