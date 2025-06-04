const { pool } = require("../config/dbConnection");

async function createTable(tableName, columns) {
  const columnDefinitions = columns.map(col => `${col.name} ${col.type}`).join(", ");
  const query = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefinitions})`;

  const connection = await pool.getConnection();
  try {
    await connection.query(query);
    console.log(`Table '${tableName}' is ready.`);
  } finally {
    connection.release();
  }
}

module.exports = { createTable };
