// import mysql from 'mysql2/promise';
// import config from '../config.js';

// const connection = mysql.createConnection({
//     host: config.DB_HOST || 'localhost',
//     user: config.DB_USER || 'root',
//     password: config.DB_PASSWORD || '1038',
//     database: config.DB_NAME || 'estebanquito',
//     port: config.DB_PORT || 3306
// });

// const getConnection = () => {
//     return connection;
// }


import mysql from 'mysql2/promise';
import config from '../config.js';

// Crear el pool de conexiones
const pool = mysql.createPool({
    host: config.DB_HOST || 'localhost',
    user: config.DB_USER || 'root',
    password: config.DB_PASSWORD || '1038',
    database: config.DB_NAME || 'estebanquito',
    port: config.DB_PORT || 3306,
    waitForConnections: true,  // Espera si no hay conexiones disponibles
    connectionLimit: 10,       // Número máximo de conexiones simultáneas
    queueLimit: 0              // Número de conexiones en cola (0 significa sin límite)
});

// Función para obtener una conexión del pool
const getConnection = async () => {
    return await pool.getConnection();
};

export { getConnection, pool };



// const getConnection = async () => {
//     try {
//         const connection = await mysql.createConnection({
//             host: config.dbHost,
//             user: config.dbUser,
//             password: config.dbPassword,
//             database: config.dbName,
//             port: config.dbPort,
//         });
//         console.log('Conexión exitosa a la base de datos');
//         return connection;
//     } catch (error) {
//         console.error('Error al conectar con la base de datos:', error.message);
//         throw error;
//     }
// };

// export { getConnection };