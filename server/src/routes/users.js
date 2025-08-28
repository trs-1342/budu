import { Router } from "express";
import { pool } from "../db.js";
import bcrypt from "bcryptjs";

const r = Router();

r.get("/", async (req, res) => {
  const q = (req.query.q || "").toString().trim();
  const [rows] = await pool.query(
    `SELECT id, username, avatar_url, role, status, createdAt FROM users
     WHERE (? = '' OR username LIKE CONCAT('%', ?, '%'))
     ORDER BY id DESC`,
    [q, q]
  );
  res.json(rows);
});

r.post("/", async (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: "username & password required" });
  const hash = await bcrypt.hash(password, 12);
  try {
    const [r1] = await pool.query(
      "INSERT INTO users (username, password, role, status, createdAt) VALUES (?, ?, ?, 'active', NOW())",
      [username, hash, role || "viewer"]
    );
    res.status(201).json({ id: r1.insertId });
  } catch (e) {
    if (e && e.code === "ER_DUP_ENTRY")
      return res.status(409).json({ error: "duplicate username" });
    throw e;
  }
});

r.get("/:id", async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, username, avatar_url, role, status, createdAt FROM users WHERE id=?",
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "not found" });
  res.json(rows[0]);
});

r.put("/:id", async (req, res) => {
  const { username, role, status, avatar_url } = req.body || {};
  await pool.query(
    "UPDATE users SET username=?, role=?, status=?, avatar_url=?, updatedAt=NOW() WHERE id=?",
    [username, role, status, avatar_url || null, req.params.id]
  );
  res.json({ ok: true });
});

r.patch("/:id/status", async (req, res) => {
  const { status } = req.body || {};
  if (!["active", "disabled"].includes(status))
    return res.status(400).json({ error: "bad status" });
  await pool.query("UPDATE users SET status=?, updatedAt=NOW() WHERE id=?", [
    status,
    req.params.id,
  ]);
  res.json({ ok: true });
});

r.delete("/:id", async (req, res) => {
  await pool.query("DELETE FROM users WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

export default r;
