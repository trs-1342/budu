import { Router } from "express";
import { pool } from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const r = Router();

r.post("/login", async (req, res) => {
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

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      avatar_url: user.avatar_url,
      status: user.status,
      createdAt: user.createdAt,
    },
  });
});

r.get("/me", async (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(200).json(null);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query(
      "SELECT id, username, avatar_url, role, status, createdAt FROM users WHERE id=?",
      [payload.id]
    );
    res.json(rows[0] || null);
  } catch {
    res.json(null);
  }
});

r.put("/me", async (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "no token" });
  const payload = jwt.verify(token, process.env.JWT_SECRET);

  const { username, avatar_url } = req.body || {};
  if (!username) return res.status(400).json({ error: "username required" });

  await pool.query(
    "UPDATE users SET username=?, avatar_url=?, updatedAt=NOW() WHERE id=?",
    [username, avatar_url || null, payload.id]
  );
  res.json({ ok: true });
});

r.put("/change-password", async (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "no token" });
  const payload = jwt.verify(token, process.env.JWT_SECRET);

  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword)
    return res
      .status(400)
      .json({ error: "currentPassword & newPassword required" });

  const [rows] = await pool.query("SELECT password FROM users WHERE id=?", [
    payload.id,
  ]);
  if (!rows[0]) return res.status(404).json({ error: "user not found" });

  const ok = await bcrypt.compare(currentPassword, rows[0].password);
  if (!ok) return res.status(400).json({ error: "current password mismatch" });

  const hash = await bcrypt.hash(newPassword, 12);
  await pool.query("UPDATE users SET password=?, updatedAt=NOW() WHERE id=?", [
    hash,
    payload.id,
  ]);
  res.json({ ok: true });
});

export default r;
