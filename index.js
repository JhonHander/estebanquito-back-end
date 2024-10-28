import express from 'express'
import userRoutes from './routes/routes.users.js'
import authRoutes from './routes/routes.auth.js'
import cors from 'cors'

//Instancia de express
const app = express();

const PORT = process.env.PORT || 3000;

//para definir un puerto
app.set('port', PORT);

// Middleware para parsear JSON solo en peticiones POST/PUT
app.use(express.json());

// Registrar rutas
// app.use('/api/users', userRoutes);
app.use(userRoutes);
app.use(authRoutes);

// console.log('Database config:', {
//     user: process.env.DB_USER,
//     host: process.env.DB_HOST,
//     port: process.env.DB_PORT,
// });


// const testConnection = async () => {
//     try {
//         const connection = await getConnection();
//         console.log('Conectado exitosamente a la base de datos');
//         connection.end();
//     } catch (error) {
//         console.error('Error al conectar:', error.message);
//     }
// };

// testConnection();

// Para permitir peticiones desde el frontend
app.use(
    cors({
        origin: 'http://localhost:5173'
    }))

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
