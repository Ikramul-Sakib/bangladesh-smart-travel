const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bd_smart_travel',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
    timezone: '+06:00', // Bangladesh Standard Time (BST)
    decimalNumbers: true
});

/**
 * Verify database connectivity on startup
 */
async function checkDatabaseConnection() {
    try {
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        return { connected: true, message: 'MySQL connection pool active' };
    } catch (error) {
        return { connected: false, message: error.message };
    }
}

/**
 * Execute multiple queries atomically inside a database transaction
 * @param {Function} callback - receives (connection)
 */
async function withTransaction(callback) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    pool,
    checkDatabaseConnection,
    withTransaction
};