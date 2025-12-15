// db.js
import mysql from 'mysql2/promise';
import 'dotenv/config'; // ES6 way to load environment variables

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4' ,
    timezone: '+06:00', 
    dateStrings: true,
});

console.log(`Attempting to connect to database: ${process.env.DB_DATABASE}`);

pool.getConnection()
    .then(connection => {
        console.log("Database connection successful!");
        connection.release();
    })
    .catch(err => {
        console.error("Database connection failed:", err.message);
        process.exit(1);
    });

export default pool; 