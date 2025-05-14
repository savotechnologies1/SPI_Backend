const { pool } = require("../config/dbConnection");

module.exports.createEmployeeTable = async () => {
    try {
      const connection = await pool.getConnection();
      await connection.query(`
        CREATE TABLE IF NOT EXISTS employee (
          id INT AUTO_INCREMENT PRIMARY KEY,
          firstName VARCHAR(100),
          lastName VARCHAR(100),
          fullName VARCHAR(255),
          hourlyRate VARCHAR(50),
          shift VARCHAR(20),
          pin VARCHAR(20),
          startDate VARCHAR(20),
          shopFloorLogin VARCHAR(20),
          department VARCHAR(100),
          createdBy INT,
          isDeleted TINYINT(1) DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      connection.release();
    } catch (error) {
      throw error; 
    }
  };