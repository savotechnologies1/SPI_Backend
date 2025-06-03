// utils/db.js
const { pool } = require('../config/dbConnection');

async function withConnection(fn) {
  const connection = await pool.getConnection();
  try {
    return await fn(connection);
  } finally {
    await connection.release();
  }
}

module.exports = { withConnection };