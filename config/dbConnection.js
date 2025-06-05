const pool = require('./db'); // pool setup (mysql2/promise)
const crypto = require('crypto');
const md5 = require('md5');
const { createTable } = require('../functions/createTable');

const connectDb = async () => {
  try {
      const { default: humanize } = await import('humanize-string');
    const connection = await pool.getConnection();
    console.log("✅ DB connected");

    await createTable("admin", [
      { name: "id", type: "CHAR(36) PRIMARY KEY" },
      { name: "name", type: "VARCHAR(100) NOT NULL" },
      { name: "email", type: "VARCHAR(100) NOT NULL UNIQUE" },
      { name: "password", type: "VARCHAR(255) NOT NULL" },
      { name: "roles", type: "ENUM('admin','superAdmin') DEFAULT 'admin'" },
      { name: "phoneNumber", type: "VARCHAR(20) UNIQUE" },
      { name: "tokens", type: "JSON" },
      { name: "otp", type: "VARCHAR(10)" },
      { name: "resetToken", type: "CHAR(36)" }, 
      { name: "isDeleted", type: "TINYINT(1) DEFAULT 0" },
    ]);

    const [rows] = await connection.query("SELECT COUNT(*) AS count FROM admin");
    if (rows[0].count === 0) {
      await connection.query(
        `INSERT INTO admin (id, name, email, password, roles, phoneNumber) VALUES (?, ?, ?, ?, ?, ?)`,
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

module.exports = connectDb;
