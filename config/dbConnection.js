const md5 = require("md5");
const moment = require("moment");
const humanize = require("string-humanize");
require("dotenv").config();
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "SHI@2002",
  database: "SPI",
});

async function createTable(tableName, columns) {
  let connection;
  try {
    connection = await pool.getConnection();

    const columnsDefinition = columns
      .map((col) => `${col.name} ${col.type}`)
      .join(", ");

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        ${columnsDefinition},
      isDeleted TINYINT(1) DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `;

    console.log("createTableQuery:", createTableQuery);
    await connection.execute(createTableQuery);
  } catch (err) {
    console.error("Error creating table:", err);
    throw err;
  } finally {
    if (connection) {
      await connection.release();
    }
  }
}

const connectDb = async () => {
  try {
    const connection = await pool.getConnection();
    console.log("connection established");

    await connection.query(`
          CREATE TABLE IF NOT EXISTS admins (
        id CHAR(36) PRIMARY KEY DEFAULT (UUID()),  
        name VARCHAR(255),
        email VARCHAR(255),
        password VARCHAR(255),
        roles VARCHAR(50),
        phoneNumber VARCHAR(20),
        isDeleted BOOLEAN DEFAULT FALSE,
        tokens JSON,
        otp TEXT,
        token TEXT
      );

    `);

    const [adminRows] = await connection.query(
      "SELECT COUNT(*) as count FROM admins"
    );

    if (adminRows[0].count === 0) {
      await connection.query(
        `INSERT INTO admins (name, email, password, roles, phoneNumber) VALUES (?, ?, ?, ?, ?)`,
        [
          humanize("admin"),
          "spiadmin@gmail.com",
          md5("Admin@123"),
          "superAdmin",
          "+911111111111",
        ]
      );
    }

    connection.release();
  } catch (err) {
    console.error("MySQL connection error:", err);
    process.exit(1);
  }
};

module.exports = { pool, connectDb, createTable };
