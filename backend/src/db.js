const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { DB } = require('./config');

let pool;

// Creates the database + tables if they do not exist (works on a fresh XAMPP MySQL).
async function init() {
  const admin = await mysql.createConnection({ host: DB.host, port: DB.port, user: DB.user, password: DB.password, multipleStatements: true });
  await admin.query(`CREATE DATABASE IF NOT EXISTS \`${DB.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await admin.end();

  pool = mysql.createPool({
    ...DB, waitForConnections: true, connectionLimit: 10, charset: 'utf8mb4',
    decimalNumbers: true, timezone: 'Z', multipleStatements: true,
  });
  let sql = fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'schema.sql'), 'utf8');
  sql = sql.replace(/^CREATE DATABASE.*$/gm, '').replace(/^USE .*$/gm, '');
  await pool.query(sql);
  return pool;
}

const getPool = () => pool;
// query helpers: rows only
const q = async (sql, params = [], conn) => (await (conn || pool).query(sql, params))[0];
const one = async (sql, params = [], conn) => (await q(sql, params, conn))[0] || null;
const exec = async (sql, params = [], conn) => (await (conn || pool).query(sql, params))[0]; // ResultSetHeader

async function tx(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = { init, getPool, q, one, exec, tx };
