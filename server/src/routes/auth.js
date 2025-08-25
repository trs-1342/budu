// server/src/routes/auth.js
import { Router } from "express";
import { pool } from "../db.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const r = Router();

// Token oluştur
function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

r.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password)
      return res.status(400).json({ error: "username & password required" });

    const [rows] = await pool.query("SELECT * FROM users WHERE username=?", [
      username,
    ]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "invalid credentials" });
    if (user.status !== "active")
      return res.status(403).json({ error: "user disabled" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "invalid credentials" });

    // Session token oluştur ve database'e kaydet
    const token = generateToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat

    await pool.query(
      "UPDATE users SET session_token=?, session_expires=? WHERE id=?",
      [token, expires, user.id]
    );

    // Cookie set et
    res.cookie("budu.sid", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 saat
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        avatar_url: user.avatar_url,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

r.get("/me", async (req, res) => {
  try {
    const token = req.cookies["budu.sid"];
    if (!token) return res.json(null);

    const [rows] = await pool.query(
      `SELECT id, username, avatar_url, role, status, createdAt 
       FROM users 
       WHERE session_token=? AND session_expires > NOW() AND status='active'`,
      [token]
    );

    const user = rows[0];
    if (!user) {
      res.clearCookie("budu.sid");
      return res.json(null);
    }

    // Token süresini yenile (rolling session)
    const newExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await pool.query("UPDATE users SET session_expires=? WHERE id=?", [
      newExpires,
      user.id,
    ]);

    res.json(user);
  } catch (error) {
    console.error("Get me error:", error);
    res.json(null);
  }
});

r.put("/me", async (req, res) => {
  try {
    const token = req.cookies["budu.sid"];
    if (!token) return res.status(401).json({ error: "not authenticated" });

    const [userRows] = await pool.query(
      "SELECT id FROM users WHERE session_token=? AND session_expires > NOW()",
      [token]
    );
    if (!userRows[0])
      return res.status(401).json({ error: "not authenticated" });

    const { username, avatar_url } = req.body || {};
    if (!username) return res.status(400).json({ error: "username required" });

    await pool.query(
      "UPDATE users SET username=?, avatar_url=?, updatedAt=NOW() WHERE id=?",
      [username, avatar_url || null, userRows[0].id]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error("Update me error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

r.put("/change-password", async (req, res) => {
  try {
    const token = req.cookies["budu.sid"];
    if (!token) return res.status(401).json({ error: "not authenticated" });

    const [userRows] = await pool.query(
      "SELECT id, password FROM users WHERE session_token=? AND session_expires > NOW()",
      [token]
    );
    if (!userRows[0])
      return res.status(401).json({ error: "not authenticated" });

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword)
      return res
        .status(400)
        .json({ error: "currentPassword & newPassword required" });

    const ok = await bcrypt.compare(currentPassword, userRows[0].password);
    if (!ok)
      return res.status(400).json({ error: "current password mismatch" });

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      "UPDATE users SET password=?, updatedAt=NOW() WHERE id=?",
      [hash, userRows[0].id]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

r.post("/logout", async (req, res) => {
  try {
    const token = req.cookies["budu.sid"];
    if (token) {
      // Database'den session'ı temizle
      await pool.query(
        "UPDATE users SET session_token=NULL, session_expires=NULL WHERE session_token=?",
        [token]
      );
    }

    res.clearCookie("budu.sid");
    res.json({ ok: true });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "logout failed" });
  }
});

export default r;
