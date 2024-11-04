import { query } from 'express';
import { getConnection } from '../database/db.js';

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

const accountExists = async (accountNumber) => {
    const connection = await getConnection();
    const [rows] = await connection.query('SELECT * FROM usuarios WHERE numero_cuenta = ?', [accountNumber]);
    return rows.length > 0;
};

const enoughBalance = async (accountNumber, amount) => {
    const connection = await getConnection();
    const [rows] = await connection.query('SELECT saldo FROM usuarios WHERE numero_cuenta = ?', [accountNumber]);
    return rows[0] >= amount;
};

export const transfer = async (req, res) => {
    // const { accountNumber, amount, destinationAccountNumber } = req.body;
    const { accountNumber, destinationAccountNumber, amount, } = req.body;

    const type = 'Transferencia';
    const date = new Date();

    const connection = await getConnection();

    try {
        await connection.beginTransaction(); // Iniciar la transacción

        // Verificar si la cuenta de destino existe
        if (!await accountExists(destinationAccountNumber)) {
            await connection.rollback();
            return res.status(404).json({ message: 'Cuenta de destino no encontrada' });
        }

        // Verificar si la cuenta de origen tiene saldo suficiente

        if (!await enoughBalance(accountNumber, amount)) {
            await connection.rollback();
            return res.status(400).json({ message: 'Saldo insuficiente' });
        }


        // // Actualizar saldo de la cuenta emisora
        // const [resultEmisor] = await connection.query(
        //     'UPDATE usuarios SET saldo = saldo - ? WHERE numero_cuenta = ?',
        //     [amount, accountNumber]
        // );

        // // Verificar que se haya afectado una fila
        // if (resultEmisor.affectedRows === 0) {
        //     await connection.rollback();
        //     return res.status(400).json({ message: 'Error al actualizar saldo del emisor' });
        // }

        // // Actualizar saldo de la cuenta de destino
        // const [resultDestino] = await connection.query(
        //     'UPDATE usuarios SET saldo = saldo + ? WHERE numero_cuenta = ?',
        //     [amount, destinationAccountNumber]
        // );

        // // Verificar que se haya afectado una fila
        // if (resultDestino.affectedRows === 0) {
        //     await connection.rollback();
        //     return res.status(400).json({ message: 'Error al actualizar saldo del destinatario' });
        // }


        // Restar el saldo de la cuenta que transfiere
        await connection.query(
            'UPDATE usuarios SET saldo = saldo - ? WHERE numero_cuenta = ?',
            [amount, accountNumber]
        );

        // Añadir el saldo a la cuenta que recibe
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
        connection.release(); // Liberar la conexión
    }
};
