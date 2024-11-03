import { getConnection } from '../database/db.js';

export const getUserByAccountNumber = async (req, res) => {
    try {
        const connection = await getConnection();
        const query = 'SELECT * FROM usuarios WHERE numero_cuenta = ?';
        const accountNumber = req.body.accountNumber
        const [rows] = await connection.query(query, accountNumber);

        if (rows.length > 0 && rows[0].numero_cuenta === accountNumber) {
            return res.json(rows[0]);
        } else {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
}


export const updateUserByAccountNumber = async (req, res) => {
    const { name, email, accountNumber } = req.body;
    const connection = await getConnection();
    try {
        const query = 'UPDATE usuarios SET nombre = ?, email = ? WHERE numero_cuenta = ?';
        // const name = req.body.name;
        // const email = req.body.email;
        // const accountNumber = req.body.accountNumber;
        await connection.query(query, [name, email, accountNumber]);

        return res.status(201).json({ message: 'Perfil actualizado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor' });
    } finally {
        connection.release(); // Liberar la conexión al pool
    }
}


