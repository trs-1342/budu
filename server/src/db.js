import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

export const pool = await mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "budu",
  password: process.env.DB_PASS || "password",
  database: process.env.DB_NAME || "BUDU",
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