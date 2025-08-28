import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

export const pool = await mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
});
export async function testConnection() {
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
}

console.log("DB connected");