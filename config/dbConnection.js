// db.js
// const md5 = require("md5");
// const humanize = require("string-humanize");
// require("dotenv").config();
// const mysql = require("mysql2/promise");

// const pool = mysql.createPool({
//   host:  "localhost",
//   user: "root",
//   password:"SHI@2002",
//   database:"SPI",
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
// });

// let dbInitialized = false;

// async function createTable(tableName, columns) {
//   let connection;
//   try {
//     connection = await pool.getConnection();

//     const columnsDefinition = columns
//       .map((col) => `${col.name} ${col.type}${col.constraints ? ' ' + col.constraints : ''}`)
//       .join(", ");

//     const createTableQuery = `
//       CREATE TABLE IF NOT EXISTS ${tableName} (
//         id CHAR(36) PRIMARY KEY,
//         ${columnsDefinition},
//         isDeleted TINYINT(1) DEFAULT 0,
//         createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
//         updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
//       );
//     `;

//     await connection.execute(createTableQuery);
//     console.log(`✅ Table '${tableName}' created or already exists`);
//   } catch (err) {
//     console.error(`❌ Error creating table '${tableName}':`, err.message);
//     throw err;
//   } finally {
//     if (connection) await connection.release();
//   }
// }

// const connectDb = async () => {
//   if (dbInitialized) return;
//   dbInitialized = true;

//   let connection;
//   try {
//     connection = await pool.getConnection();
//     console.log("✅ Database connection established");

//     await connection.query(`
//       CREATE TABLE IF NOT EXISTS admins (
//         id CHAR(36) PRIMARY KEY, 
//         name VARCHAR(100) NOT NULL,
//         email VARCHAR(100) NOT NULL UNIQUE,
//         password VARCHAR(255) NOT NULL,
//         roles ENUM('admin', 'superAdmin') DEFAULT 'admin',
//         phoneNumber VARCHAR(20) UNIQUE,
//         isDeleted BOOLEAN DEFAULT FALSE,
//         tokens JSON,
//         otp VARCHAR(10), 
//         otpExpiry DATETIME,
//         resetToken CHAR(36), 
//         resetTokenExpiry DATETIME,
//         createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//         INDEX idx_email (email),
//         INDEX idx_phone (phoneNumber)
//       );
//     `);

//     const [rows] = await connection.query(
//       "SELECT COUNT(*) as count FROM admins WHERE email = 'spiadmin@gmail.com'"
//     );

//     if (rows[0].count === 0) {
//       await connection.query(
//         `INSERT INTO admins (id, name, email, password, roles, phoneNumber) VALUES (UUID(), ?, ?, ?, ?, ?)`,
//         [
//           humanize("admin"),
//           "spiadmin@gmail.com",
//           md5("Admin@123"),
//           "superAdmin",
//           "+911111111111",
//         ]
//       );
//     }

//   } catch (err) {
//     console.error("❌ Database connection error:", err);
//     throw err;
//   } finally {
//     if (connection) {
//       await connection.release();
//       console.log("🔁 Connection released");
//     }
//   }
// };

// module.exports = { pool, connectDb, createTable };

// db.js
// const mysql = require('mysql2/promise');

// const pool = mysql.createPool({
//    host:  "localhost",
//   user: "root",
//   password:"SHI@2002",
//   database:"SPI",
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
// });


// module.exports = pool;

const md5 = require("md5");
const humanize = require("string-humanize");
const crypto = require("crypto");
const { pool } = require("./connection");
require("dotenv").config();


// ✅ Function to create any table dynamically
async function createTable(tableName, columns) {
  let connection;
  try {
    connection = await pool.getConnection();

    const columnsDefinition = columns
      .map((col) => `${col.name} ${col.type}`)
      .join(", ");

    const query = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        ${columnsDefinition},
        isDeleted TINYINT(1) DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `;

    await connection.execute(query);
    console.log(`✅ Table '${tableName}' created or already exists`);
  } catch (err) {
    console.error("❌ Error in createTable:", err.message);
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

// ✅ DB connection + ensure `admins` table + default admin insert
const connectDb = async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ DB connected");

    // Call createTable for `admins`
    await createTable("admins", [
      { name: "id", type: "CHAR(36) PRIMARY KEY" },
      { name: "name", type: "VARCHAR(100) NOT NULL" },
      { name: "email", type: "VARCHAR(100) NOT NULL UNIQUE" },
      { name: "password", type: "VARCHAR(255) NOT NULL" },
      { name: "roles", type: "ENUM('admin','superAdmin') DEFAULT 'admin'" },
      { name: "phoneNumber", type: "VARCHAR(20) UNIQUE" },
      { name: "tokens", type: "JSON" },
      { name: "otp", type: "VARCHAR(10)" },
      { name: "resetToken", type: "CHAR(36)" },
    ]);

    // Insert default admin if not present
    const [rows] = await connection.query("SELECT COUNT(*) AS count FROM admins");
    if (rows[0].count === 0) {
      await connection.query(
        `INSERT INTO admins (id, name, email, password, roles, phoneNumber) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          humanize("admin"),
          "spiadmin@gmail.com",
          md5("Admin@123"),
          "superAdmin",
          "+911111111111",
        ]
      );
      console.log("✅ Default admin created.");
    }

    connection.release();
  } catch (err) {
    console.error("❌ connectDb Error:", err.message);
    process.exit(1);
  }
};

module.exports = {
 
  connectDb,
  createTable,
};
