const mysql = require('mysql2');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Configuración del Pool de conexiones
const dbConfig = process.env.MYSQL_URL || {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Convertir a promesas para poder usar async/await (código más moderno)
const promisePool = pool.promise();

// Probar la conexión al iniciar
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ ERROR AL CONECTAR A LA BASE DE DATOS:');
        console.error('Código:', err.code);
        console.error('Mensaje:', err.message);
        
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('LA CONEXIÓN CON LA BASE DE DATOS SE CERRÓ.');
        } else if (err.code === 'ER_CON_COUNT_ERROR') {
            console.error('LA BASE DE DATOS TIENE MUCHAS CONEXIONES.');
        } else if (err.code === 'ECONNREFUSED') {
            console.error('LA CONEXIÓN FUE RECHAZADA. Verifica tus credenciales (MYSQL_URL o DB_HOST).');
        } else if (err.code === 'ENOTFOUND') {
            console.error('NO SE ENCONTRÓ EL HOST DE LA BASE DE DATOS.');
        }
    } else if (connection) {
        console.log('✅ Conectado exitosamente a la Base de Datos MySQL');
        connection.release();
    }
});

module.exports = promisePool;