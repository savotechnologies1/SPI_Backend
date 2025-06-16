const pool = require('../config/db'); // Adjust the path as needed

async function createTable(tableName, columns) {
  const connection = await pool.getConnection();
  try {
    const columnDefs = columns
      .map((col) => `${col.name} ${col.type}`)
      .join(', ');

    
    const query = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        ${columnDefs},
        isDeleted TINYINT(1) DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `;

    await connection.query(query);
  } catch (err) {
    console.error(` Error creating table '${tableName}':`, err);
  } finally {
    connection.release();
  }
}

module.exports = { createTable };
