const mysql = require('mysql2');
require('dotenv').config()

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "SHI@2002",
  database: process.env.DB_NAME || 'SPI',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool.promise();
