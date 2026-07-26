import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.NODE_ENV === 'test'
        ? (process.env.DB_NAME_TEST || 'flemart_test')
        : (process.env.DB_NAME || 'flemart'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export async function getConnection() {
    return await pool.getConnection();
}

export default pool;
