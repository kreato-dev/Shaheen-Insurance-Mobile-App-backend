// src/config/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'shaheen_app',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Basic query helper
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<Array>} rows
 */
async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/**
 * Get raw connection for transactions (if needed)
 */
async function getConnection() {
  return pool.getConnection();
}

// Log pool stats on every request
function logPoolStats() {
  console.log({
    totalConnections: pool.pool._allConnections.length,
    freeConnections: pool.pool._freeConnections.length,
    waitingRequests: pool.pool._connectionQueue.length,
  });
}

module.exports = {
  pool,
  query,
  getConnection,
  logPoolStats,
};
