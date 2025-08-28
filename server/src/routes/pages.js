import { Router } from "express";
import { pool } from "../db.js";

const r = Router();

r.get("/", async (req, res) => {
  const q = (req.query.q || "").toString().trim();
  const [rows] = await pool.query(
    `SELECT * FROM pages
     WHERE (? = '' OR title LIKE CONCAT('%', ?, '%') OR path LIKE CONCAT('%', ?, '%'))
     ORDER BY order_index ASC, id DESC`,
    [q, q, q]
  );
  res.json(rows);
});

r.post("/", async (req, res) => {
  const {
    title,
    path,
    is_active = true,
    show_in_menu = true,
    order_index = 0,
  } = req.body || {};
  if (!title || !path)
    return res.status(400).json({ error: "title & path required" });
  await pool.query(
    "INSERT INTO pages (title, path, is_active, show_in_menu, order_index) VALUES (?, ?, ?, ?, ?)",
    [title, path, !!is_active, !!show_in_menu, Number(order_index) || 0]
  );
  res.status(201).json({ ok: true });
});

r.get("/:id", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM pages WHERE id=?", [
    req.params.id,
  ]);
  if (!rows[0]) return res.status(404).json({ error: "not found" });
  res.json(rows[0]);
});

r.put("/:id", async (req, res) => {
  const { title, path, order_index } = req.body || {};
  await pool.query(
    "UPDATE pages SET title=?, path=?, order_index=?, updatedAt=NOW() WHERE id=?",
    [title, path, Number(order_index) || 0, req.params.id]
  );
  res.json({ ok: true });
});

r.patch("/:id/toggle-active", async (req, res) => {
  await pool.query(
    "UPDATE pages SET is_active = NOT is_active, updatedAt=NOW() WHERE id=?",
    [req.params.id]
  );
  res.json({ ok: true });
});

r.patch("/:id/toggle-menu", async (req, res) => {
  await pool.query(
    "UPDATE pages SET show_in_menu = NOT show_in_menu, updatedAt=NOW() WHERE id=?",
    [req.params.id]
  );
  res.json({ ok: true });
});

r.delete("/:id", async (req, res) => {
  await pool.query("DELETE FROM pages WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

export default r;
