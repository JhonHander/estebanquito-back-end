import express from 'express'
import userRoutes from './routes/routes.users.js'
import authRoutes from './routes/routes.auth.js'
import cors from 'cors'

//Instancia de express
const app = express();

const PORT = process.env.PORT || 3000;

//para definir un puerto
app.set('port', PORT);

// Middleware para habilitar CORS
app.use(
    cors({
        origin: 'http://localhost:5173', // URL del frontend
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true, // Si estás manejando cookies o tokens
    })
);


// Middleware para parsear JSON solo en peticiones POST/PUT
app.use(express.json());

// Registrar rutas
app.use(userRoutes);
app.use(authRoutes);


// Para permitir peticiones desde el frontend
app.use(
    cors({
        origin: 'http://localhost:5173/',

    }))

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});


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