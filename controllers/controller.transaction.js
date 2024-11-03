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
}

const enoughBalance = async (accountNumber, amount) => {
    const connection = await getConnection();
    const [rows] = await connection.query('SELECT saldo FROM usuarios WHERE numero_cuenta = ?', [accountNumber]);
    return rows[0].saldo >= amount;
}


export const transfer = async (req, res) => {
    const { accountNumber, amount, destinationAccountNumber } = req.body;
    const connection = await getConnection();
    try {
        await connection.beginTransaction(); // Iniciar la transacción

        if (!await accountExists(destinationAccountNumber)) {
            return res.status(404).json({ message: 'Cuenta de destino no encontrada' });
        }

        if (!await enoughBalance(accountNumber, amount)) {
            return res.status(400).json({ message: 'Saldo insuficiente' });
        }

        await connection.query('UPDATE usuarios SET saldo = saldo - ? WHERE numero_cuenta = ?', [amount, accountNumber]);
        await connection.query('UPDATE usuarios SET saldo = saldo + ? WHERE numero_cuenta = ?', [amount, destinationAccountNumber]);

        await connection.commit(); // Confirmar la transacción
        // return res.status(201).json({ message: 'Transferencia realizada', destination: { destinationAccountNumber } });
        return res.status(201).json({ message: 'Transferencia realizada' });
    } catch (error) {
        await connection.rollback(); // Revertir la transacción en caso de error
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor' });
    } finally {
        connection.release(); // Liberar la conexión
    }
};
