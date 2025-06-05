const pool = require('../config/db'); // Adjust the path as needed

async function createTable(tableName, columns) {
  const connection = await pool.getConnection();
  try {
    const columnDefs = columns
      .map((col) => `${col.name} ${col.type}`)
      .join(', ');

    const query = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefs})`;

    await connection.query(query);
    console.log(`✅ Table '${tableName}' is ready.`);
  } catch (err) {
    console.error(`❌ Error creating table '${tableName}':`, err);
  } finally {
    connection.release();
  }
}

module.exports = { createTable };
