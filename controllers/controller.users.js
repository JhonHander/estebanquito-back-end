
// import { getConnection } from "../database/db.js";

// const getUsers = async (req, res) => {
//     try {
//         const connection = await getConnection();
//         const result = await connection.query('SELECT * FROM usuarios');
//         return res.json(result[0])
//     } catch (error) {
//         console.log(error)
//         res.status(500).json({ message: 'Internal Server Error' })
//         res.status(404).json({ message: 'Not Found' })
//     }
// }

// export default getUsers;

import { getConnection } from '../database/db.js';

export const getUsers = async (req, res) => {
    try {
        const connection = await getConnection();
        const [rows] = await connection.query('SELECT * FROM usuarios');
        return res.json(rows); // Asegúrate de enviar los datos como JSON
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

