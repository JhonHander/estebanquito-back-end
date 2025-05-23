import express from 'express'
import userRoutes from './routes/routes.user.js'
import authRoutes from './routes/routes.auth.js'
import transactionRoutes from './routes/routes.transaction.js'
import reportRoutes from './routes/routes.report.js'
import { corsMiddleware } from './middleware/corsMiddleware.js'

// import { recalculateInterestOnStart } from './controllers/controller.loan.js'
import cron from 'node-cron'
import { recalculateInterest } from './controllers/controller.loan.js'
import loanRoutes from './routes/routes.loan.js'
import cors from 'cors'

//Instancia de express
const app = express();

const PORT = process.env.PORT || 3000;

//para definir un puerto
app.set('port', PORT);

// Middleware para habilitar CORS
app.use(corsMiddleware);

// Middleware para parsear JSON solo en peticiones POST/PUT
app.use(express.json());

// Registrar rutas
app.use(userRoutes);
app.use(authRoutes);
app.use(transactionRoutes);
app.use(loanRoutes);
app.use(reportRoutes);


// Ejecuta el cron job todos los días a medianoche
cron.schedule('0 0 * * *', recalculateInterest);

// Para permitir peticiones desde el frontend
app.use(
    cors({
        origin: 'http://localhost:5173',
    }))

app.listen(PORT, async () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);

    await recalculateInterest();
});