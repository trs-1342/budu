// server/src/middlewares/auth.js
import { pool } from "../db.js";

export function requireAuth(requiredRole) {
  return async (req, res, next) => {
    try {
      const token = req.cookies["budu.sid"];
      if (!token) {
        return res.status(401).json({ error: "not authenticated" });
      }

      const [rows] = await pool.query(
        `SELECT id, username, role, status 
         FROM users 
         WHERE session_token=? AND session_expires > NOW() AND status='active'`,
        [token]
      );

      const user = rows[0];
      if (!user) {
        res.clearCookie("budu.sid");
        return res.status(401).json({ error: "invalid session" });
      }

      // Rol kontrolü
      if (requiredRole && user.role !== requiredRole) {
        return res.status(403).json({ error: "forbidden" });
      }

      // Kullanıcı bilgilerini req'e ekle
      req.user = user;
      next();
    } catch (error) {
      console.error("Auth middleware error:", error);
      return res.status(500).json({ error: "authentication error" });
    }
  };
}
