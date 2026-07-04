const mysql = require('mysql2');
require('dotenv').config();

// Create a connection pool. A pool allows us to reuse connections instead of opening and closing one every time.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'civic_connect',
  waitForConnections: true,
  connectionLimit: 10, // Max number of connections to keep open at once
  queueLimit: 0
});

// We convert the pool to use promises. This lets us use the modern "async/await" syntax in JavaScript, which is much cleaner than callback functions.
const promisePool = pool.promise();

module.exports = promisePool;
