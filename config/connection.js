const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host:  "localhost",
  user: "root",
  password:  "SHI@2002",
  database:"SPI",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
});
module.exports = {pool}
