import { getConnection } from "../database/db.js";
import config from '../config.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

//existe un usuario
export const userExists = async (accountNumber) => {

    const connection = await getConnection();

    try {
        const [rows] = await connection.query('SELECT * FROM usuarios WHERE numero_cuenta = ?', [accountNumber]);
        return rows.length > 0;
    } catch (error) {
        console.error(error);
    } finally {
        connection.release(); // Liberar la conexión
    }
}

const querys = async (query, values) => {

    const connection = await getConnection();

    try {
        const [rows] = await connection.query(query, values);
        return [rows];
    } catch (error) {
        console.error(error);
    } finally {
        connection.release(); // Liberar la conexión
    }
}

export const register = async (req, res) => {
    const { accountNumber, name, email, password, type } = req.body;
    const balance = 0;

    try {
        // console.log('contraseña pre-hash ', req.body['password'])
        const hashedPassword = await bcrypt.hash(password, 10);

        if (await userExists(accountNumber)) {
            return res.status(400).json({ message: `El usuario ya existe` });
        }

        const query = 'INSERT INTO usuarios (numero_cuenta, nombre, email, contraseña, tipo, saldo) VALUES (?, ?, ?, ?, ?, ?)';
        const values = [accountNumber, name, email, hashedPassword, type, balance];
        querys(query, values);

        res.status(201).json({ message: 'Usuario registrado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
}

export const login = async (req, res) => {
    const { accountNumber, password } = req.body;

    const connection = await getConnection();

    try {

        const query = 'SELECT * FROM usuarios WHERE numero_cuenta = ?';
        const [rows] = await connection.query(query, accountNumber);

        //si existe el usuario
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const user = rows[0];

        // Comparar la contraseña con bcrypt
        const validPassword = await bcrypt.compare(password, user.contraseña);
        if (!validPassword) {
            return res.status(401).json({ message: 'Contraseña incorrecta' });
        }

        //crear el jwt
        const token = jwt.sign(
            { numero_cuenta: user.numero_cuenta },
            config.jwtSecret,
            { expiresIn: '1h' }
        );

        return res.status(201).json({ message: 'Inicio exitoso', token: token });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error en el servidor' });
    }
    finally {
        connection.release(); // Liberar la conexión
    }
};

