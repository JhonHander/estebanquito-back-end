import { getConnection } from '../database/db.js';
import { userExists } from './controller.auth.js';
import { calculateTotalIncome } from './controller.report.js';
import { calculateTotalOutcome, } from './controller.report.js';


export const hasLoan = async (account) => {
    const connection = await getConnection();

    try {
        const query = 'SELECT * FROM prestamos WHERE numero_cuenta = ? AND estado = "Aprobado"';
        const accountNumber = account;
        const [rows] = await connection.query(query, accountNumber);
        // console.log(rows)

        return rows.length > 0;

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor' });
    } finally {
        connection.release();
    }
}


export const updateOrCreateReport = async (accountNumber) => {
    const connection = await getConnection();

    try {
        // Calcular ingresos y egresos totales usando las funciones de cálculo
        const totalIncome = await calculateTotalIncome(accountNumber);
        const totalOutcome = await calculateTotalOutcome(accountNumber);

        // Verificar si el registro ya existe
        const [existingReport] = await connection.query(
            'SELECT 1 FROM Reportes WHERE numero_cuenta = ?',
            [accountNumber]
        );

        if (existingReport.length > 0) {
            // Actualizar el registro si ya existe
            await connection.query(`
                UPDATE reportes 
                SET historico_ingresos = ?, historico_egresos = ? 
                WHERE numero_cuenta = ?
            `, [totalIncome, totalOutcome, accountNumber]);
        } else {
            await connection.query(`
                INSERT INTO reportes (numero_cuenta, historico_ingresos, historico_egresos) 
                VALUES (?, ?, ?)
            `, [accountNumber, totalIncome, totalOutcome]);
        }

        // console.log(`Reporte actualizado para la cuenta ${accountNumber}`);
    } catch (error) {
        console.error('Error al actualizar o crear el reporte:', error);
        throw error;
    } finally {
        connection.release();
    }
};


export const askForLoan = async (req, res) => {
    const { accountNumber, amount, term } = req.body;
    const connection = await getConnection();
    const date = new Date();
    const status = 'Aprobado';

    try {

        // if (await hasLoan(accountNumber)) {
        //     await connection.rollback();
        //     return res.status(400).json({ message: `El usuario ya tiene un préstamo activo` });
        // }

        const query = 'INSERT INTO prestamos (numero_cuenta, monto, plazo, estado, fecha_solicitud) VALUES (?, ?, ?, ?, ?)';
        const values = [accountNumber, amount, term, status, date];
        await connection.query(query, values);

        // const updateBalanceQuery = 'UPDATE usuarios SET saldo = saldo + ? WHERE numero_cuenta = ?';
        // await connection.query(updateBalanceQuery, [amount, accountNumber]);

        // Actualizar o crear el reporte de la cuenta
        await updateOrCreateReport(accountNumber);
        return res.status(201).json({ message: 'Préstamo solicitado' });

    } catch (error) {
        console.error(error);
        await connection.rollback();
        res.status(500).json({ message: 'Error en el servidor' });
    } finally {
        connection.release();
    }
}


export async function recalculateInterest() {
    const connection = await getConnection();

    try {
        // Encuentra préstamos vencidos y calcula intereses cada 15 días
        const [loans] = await connection.query(`
            SELECT p.numero_cuenta, p.monto, r.deudas, p.fecha_solicitud, p.plazo
            FROM Prestamos p
            JOIN Reportes r ON p.numero_cuenta = r.numero_cuenta
            WHERE p.estado = 'Aprobado' 
              AND CURDATE() > DATE_ADD(p.fecha_solicitud, INTERVAL p.plazo WEEK)
        `);

        console.log(loans)

        for (const loan of loans) {

            const fechaVencimiento = new Date(loan.fecha_solicitud);
            fechaVencimiento.setDate(fechaVencimiento.getDate() + loan.plazo);

            const diasDesdeVencimiento = Math.floor((new Date() - fechaVencimiento) / (1000 * 60 * 60 * 24));
            console.log(diasDesdeVencimiento)
            const periodosInteres = Math.floor(diasDesdeVencimiento / 15);

            // Verifica si ya se ha aplicado el interés para este período
            const [existingRecords] = await connection.query(`
                SELECT COUNT(*) AS conteo
                FROM historial_intereses
                WHERE numero_cuenta = ? 
                  AND fecha = CURDATE()
            `, [loan.numero_cuenta]);

            if (existingRecords[0].conteo < periodosInteres) {
                // Calcula el monto de interés
                const interestAmount = loan.monto * 0.05 * periodosInteres;

                // Inserta el nuevo interés en Historial_intereses
                await connection.query(`
                    INSERT INTO Historial_intereses (numero_cuenta, monto_interes, fecha)
                    VALUES (?, ?, CURDATE())
                `, [loan.numero_cuenta, interestAmount]);

                // Actualiza la deuda en Reportes
                await connection.query(`
                    UPDATE Reportes 
                    SET deudas = deudas + ?
                    WHERE numero_cuenta = ?
                `, [interestAmount, loan.numero_cuenta]);

                console.log(`Intereses recalculados para el usuario ${loan.numero_cuenta} y monto de ${interestAmount}`);
            }
        }

    } catch (error) {
        console.error('Error al recalcular intereses:', error);
    } finally {
        connection.release();
    }
}


// export const recalculateInterestOnStart = async () => {
//     const connection = await getConnection();

//     try {
//         const query = `
//             UPDATE prestamos
//             SET monto = monto * 1.05,
//                 interes_acumulado = interes_acumulado + (monto * 0.05)
//             WHERE estado = 'Aprobado' AND CURDATE() > DATE_ADD(fecha_solicitud, INTERVAL plazo DAY)
//         `;
//         await connection.query(query);
//         // console.log('Intereses recalculados y acumulados al inicio del servidor.');
//     } catch (error) {
//         console.error('Error al recalcular intereses:', error);
//     } finally {
//         connection.release();
//     }
// };
