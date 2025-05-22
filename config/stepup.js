const md5 = require("md5");
const humanize = require("string-humanize");
const { pool } = require("./dbConnection");

async function setupDatabase() {
  try {
    const connection = await pool.getConnection();

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
      console.log("✅ Admin added");
    }

    connection.release();
    console.log("✅ DB setup complete");
  } catch (err) {
    console.error("❌ Setup error:", err);
  }
}

setupDatabase();
