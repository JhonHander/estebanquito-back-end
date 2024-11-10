import { query } from 'express';
import { getConnection } from '../database/db.js';
import { userExists } from './controller.auth.js';

export const getTransactionsByUser = async (req, res) => {
    const connection = await getConnection();

    try {
        const query = 'SELECT * FROM transacciones WHERE cuenta_principal_id = ?';
        const accountNumber = req.body.accountNumber;
        const [rows] = await connection.query(query, accountNumber);

        if (rows.length > 0) {
            return res.status(201).json(rows);
        } else {
            return res.status(404).json({ message: 'Transacción no encontrada' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor' });
    } finally {
        connection.release(); // Liberar la conexión al pool
    }
}

export const enoughBalance = async (accountNumber, amount) => {
    const connection = await getConnection();
    try {
        const query = 'SELECT saldo FROM usuarios WHERE numero_cuenta = ?';
        const [rows] = await connection.query(query, [accountNumber]);

        if (rows.length === 0) return false; // La cuenta no existe

        if (!userExists(accountNumber)) {
            return false;
        }

        const saldo = parseFloat(rows[0].saldo); // Convertimos el saldo a un número
        return saldo >= amount;
    } catch (error) {
        console.error("Error al verificar el saldo:", error);
        return false;
    } finally {
        connection.release();
    }
};


export const transfer = async (req, res) => {
    // const { accountNumber, amount, destinationAccountNumber } = req.body;
    const { accountNumber, destinationAccountNumber, amount, } = req.body;

    const type = 'Transferencia';
    const date = new Date();

    const connection = await getConnection();

    try {
        await connection.beginTransaction(); // Iniciar la transacción

        if (!await userExists(destinationAccountNumber)) {
            await connection.rollback();
            return res.status(404).json({ message: 'Cuenta de destino no encontrada' });
        }

        if (!await enoughBalance(accountNumber, amount)) {
            await connection.rollback();
            return res.status(400).json({ message: 'Saldo insuficiente' });
        }

        // saldo al que envía
        await connection.query(
            'UPDATE usuarios SET saldo = saldo - ? WHERE numero_cuenta = ?',
            [amount, accountNumber]
        );

        // saldo al que recibe
        await connection.query(
            'UPDATE usuarios SET saldo = saldo + ? WHERE numero_cuenta = ?',
            [amount, destinationAccountNumber]
        );

        const query = 'INSERT INTO transacciones (cuenta_principal_id, cuenta_destino_id, tipo, monto, fecha) VALUES (?, ?, ?, ?, ?)';
        const values = [accountNumber, destinationAccountNumber, type, amount, date];

        // Registrar la transacción en la tabla `transacciones`
        await connection.query(query, values);

        await connection.commit(); // Confirmar la transacción
        return res.status(201).json({ message: 'Transferencia realizada' });

    } catch (error) {
        await connection.rollback(); // Revertir la transacción en caso de error
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor' });
    } finally {
        connection.release();
    }
};


//withdrawMoney function
export const withdrawMoney = async (req, res) => {
    const { accountNumber, amount } = req.body;
    const type = 'Retiro';
    const date = new Date();

    const connection = await getConnection();

    try {
        await connection.beginTransaction()

        if (!await enoughBalance(accountNumber, amount)) {
            await connection.rollback(); // Revierte la transacción
            return res.status(400).json({ message: 'Saldo insuficiente' });
        }

        await connection.query(
            'UPDATE usuarios SET saldo = saldo - ? WHERE numero_cuenta = ?',
            [amount, accountNumber]
        );

        // const query = 'UPDATE usuarios SET saldo = saldo - ? WHERE numero_cuenta = ?';
        const query = 'INSERT INTO transacciones (cuenta_principal_id, cuenta_destino_id, tipo, monto, fecha) VALUES (?, ?, ?, ?, ?)';
        const values = [accountNumber, null, type, amount, date];
        // const values = [amount, accountNumber];
        await connection.query(query, values);

        await connection.commit(); // Confirma la transacción
        return res.status(201).json({ message: 'Retiro realizado' });
    } catch (error) {
        console.error(error);
        await connection.rollback(); // Revierte la transacción en caso de error
        res.status(500).json({ message: 'Error en el servidor' });
    } finally {
        connection.release();
    }
};
