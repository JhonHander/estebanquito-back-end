import { getConnection } from '../database/db.js';


export const showTotalIncome = async (req, res) => {
    const accountNumber = req.body.accountNumber;

    const connection = await getConnection();

    try {
        const [rows] = await connection.query('SELECT historico_ingresos AS income FROM reportes WHERE numero_cuenta = ?', [accountNumber]);
        const totalIncome = parseFloat(rows[0].income) || 0;

        return res.status(200).json({ totalIncome });


    } catch (error) {
        console.error('Error al obtener el ingreso total:', error);
        res.status(500).json({ message: 'Error al obtener el ingreso total' });
    } finally {
        connection.release();
    }
}

export const showTotalOutcome = async (req, res) => {
    const accountNumber = req.body.accountNumber;
    const connection = await getConnection();

    try {
        const [rows] = await connection.query('SELECT historico_egresos AS outcome FROM reportes WHERE numero_cuenta = ?', [accountNumber]);
        const totalOutcome = parseFloat(rows[0].outcome) || 0;

        return res.status(200).json({ totalOutcome });

    } catch (error) {
        console.error('Error al obtener el egreso total:', error);
        res.status(500).json({ message: 'Error al obtener el egreso total' });
    }
    finally {
        connection.release();
    }
}


export const showTotalDebts = async (req, res) => {
    const accountNumber = req.body.accountNumber;
    const connection = await getConnection();

    try {
        const [rows] = await connection.query('SELECT deudas AS debts FROM reportes WHERE numero_cuenta = ?', [accountNumber]);
        const totalDebts = parseFloat(rows[0].debts) || 0;

        return res.status(200).json({ totalDebts });

    } catch (error) {
        console.error('Error al obtener la deuda total:', error);
        res.status(500).json({ message: 'Error al obtener la deuda total' });
    }
    finally {
        connection.release();
    }
}

export const calculateTotalIncome = async (accountNumber) => {
    const connection = await getConnection();

    try {
        // Sumar el monto de las transferencias recibidas
        const [transferRows] = await connection.query(`
            SELECT SUM(monto) AS totalTransfers
            FROM Transacciones
            WHERE tipo = 'Transferencia' AND cuenta_destino_id = ?
        `, [accountNumber]);

        const totalTransfers = parseFloat(transferRows[0].totalTransfers) || 0;

        // Sumar el monto de los depósitos
        const [depositRows] = await connection.query(`
            SELECT SUM(monto) AS totalDeposits
            FROM Transacciones
            WHERE tipo = 'Deposito' AND cuenta_principal_id = ?
        `, [accountNumber]);

        const totalDeposits = parseFloat(depositRows[0].totalDeposits) || 0;

        // Sumar el monto de los préstamos
        const [loanRows] = await connection.query(`
            SELECT SUM(monto) AS totalLoans
            FROM Prestamos
            WHERE numero_cuenta = ?
        `, [accountNumber]);

        const totalLoans = parseFloat(loanRows[0].totalLoans) || 0;
        const totalIn = totalTransfers + totalDeposits + totalLoans;

        return totalIn;

    } catch (error) {
        console.error('Error al calcular el ingreso total:', error);
        throw error;
    } finally {
        connection.release();
    }
}


export const calculateTotalOutcome = async (accountNumber) => {
    const connection = await getConnection();

    try {
        // Sumar el monto de las transferencias enviadas
        const [transferRows] = await connection.query(`
            SELECT SUM(monto) AS totalTransfersSent
            FROM Transacciones
            WHERE tipo = 'Transferencia' AND cuenta_principal_id = ?
        `, [accountNumber]);

        const totalTransfersSent = parseFloat(transferRows[0].totalTransfersSent) || 0;

        // Sumar el monto de los retiros
        const [withdrawRows] = await connection.query(`
            SELECT SUM(monto) AS totalWithdrawals
            FROM Transacciones
            WHERE tipo = 'Retiro' AND cuenta_principal_id = ?
        `, [accountNumber]);

        const totalWithdrawals = parseFloat(withdrawRows[0].totalWithdrawals) || 0;

        const totalOut = totalTransfersSent + totalWithdrawals;
        return totalOut;

    } catch (error) {
        console.error('Error al calcular el egreso total:', error);
        throw error;
    } finally {
        connection.release();
    }
}

//para deudas hay un trigger en la base de datos que se encarga de actualizar el campo de deudas en la tabla de reportes
//cuando se hace un prestamo de manera automatica asi:

// DELIMITER //
// CREATE TRIGGER actualizarDeudaReporte
// AFTER INSERT ON prestamos
// FOR EACH ROW
// BEGIN
//     IF NEW.estado = 'Aprobado' THEN
//         -- Actualizar el campo `deudas` en `Reportes` sumando el monto del préstamo aprobado
//         UPDATE reportes
//         SET deudas = deudas + NEW.monto
//         WHERE numero_cuenta = NEW.numero_cuenta;

//         -- Actualizar el saldo del usuario en la tabla `Usuarios`
//         UPDATE usuarios
//         SET saldo = saldo + NEW.monto
//         WHERE numero_cuenta = NEW.numero_cuenta;
//     END IF;
// END //
// DELIMITER ;

// import { getConnection } from '../database/db.js';

// export const totalIncome = async (req, res) => {
//     const connection = await getConnection();
//     const accountNumber = req.body.accountNumber;

//     try {
//         // Sumar el monto de las transferencias recibidas
//         const [transferRows] = await connection.query(`
//             SELECT SUM(monto) AS totalTransfers
//             FROM Transacciones
//             WHERE tipo = 'Transferencia' AND cuenta_destino_id = ?
//         `, [accountNumber]);

//         const totalTransfers = parseFloat(transferRows[0].totalTransfers) || 0;

//         // Sumar el monto de los depósitos
//         const [depositRows] = await connection.query(`
//             SELECT SUM(monto) AS totalDeposits
//             FROM Transacciones
//             WHERE tipo = 'Depósito' AND cuenta_principal_id = ?
//         `, [accountNumber]);

//         const totalDeposits = parseFloat(depositRows[0].totalDeposits) || 0;

//         // Sumar el monto de los préstamos
//         const [loanRows] = await connection.query(`
//             SELECT SUM(monto) AS totalLoans
//             FROM Prestamos
//             WHERE numero_cuenta = ?
//         `, [accountNumber]);

//         const totalLoans = parseFloat(loanRows[0].totalLoans) || 0;

//         // Verifica si hay al menos un resultado en cada consulta
//         if (totalTransfers !== 0 || totalDeposits !== 0 || totalLoans !== 0) {

//             const totalIn = totalTransfers + totalDeposits + totalLoans;

//             await connection.query(`
//                 INSERT INTO Reportes (numero_cuenta, historico_ingresos)
//                 VALUES (?, ?)
//                 ON DUPLICATE KEY UPDATE historico_ingresos = historico_ingresos + ?
//             `, [accountNumber, totalIn, totalIn]);

//             return res.status(200).json({
//                 totalTransfers,
//                 totalDeposits,
//                 totalLoans
//             });
//         } else {
//             return res.status(404).json({ message: 'No se encontraron ingresos para esta cuenta' });
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Error en el servidor' });
//     } finally {
//         connection.release();
//     }
// };



// export const totalOutcome = async (req, res) => {
//     const connection = await getConnection();
//     const accountNumber = req.body.accountNumber;

//     try {
//         // Sumar el monto de las transferencias enviadas
//         const [transferRows] = await connection.query(`
//             SELECT SUM(monto) AS totalTransfersSent
//             FROM Transacciones
//             WHERE tipo = 'Transferencia' AND cuenta_principal_id = ?
//         `, [accountNumber]);

//         const totalTransfersSent = parseFloat(transferRows[0].totalTransfersSent) || 0;

//         // Sumar el monto de los retiros
//         const [withdrawRows] = await connection.query(`
//             SELECT SUM(monto) AS totalWithdrawals
//             FROM Transacciones
//             WHERE tipo = 'Retiro' AND cuenta_principal_id = ?
//         `, [accountNumber]);

//         const totalWithdrawals = parseFloat(withdrawRows[0].totalWithdrawals) || 0;

//         // Verifica si hay al menos un resultado en cada consulta
//         if (totalTransfersSent !== 0 || totalWithdrawals !== 0) {

//             const totalOut = totalTransfersSent + totalWithdrawals;
//             await connection.query(`
//                 INSERT INTO Reportes (numero_cuenta, historico_egresos)
//                 VALUES (?, ?)
//                 ON DUPLICATE KEY UPDATE historico_egresos = historico_egresos + ?
//             `, [accountNumber, totalOut, totalOut]);


//             return res.status(200).json({
//                 totalTransfersSent,
//                 totalWithdrawals
//             });
//         } else {
//             return res.status(404).json({ message: 'No se encontraron egresos para esta cuenta' });
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Error en el servidor' });
//     } finally {
//         connection.release();
//     }
// };
