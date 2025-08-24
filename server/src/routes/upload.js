// server/src/routes/upload.js
import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
// ✅ pool'u mutlaka içeri al
import { pool } from "../db.js";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = Date.now() + "-" + Math.random().toString(36).slice(2) + ext;
    cb(null, name);
  },
});
function fileFilter(_req, file, cb) {
  const ok = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/svg+xml",
    "image/x-icon",
  ].includes(file.mimetype);
  cb(ok ? null : new Error("invalid mime"), ok);
}
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const r = Router();

r.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "file required" });

    // Dosya URL'si
    const url = `${process.env.BASE_URL || ""}/uploads/${req.file.filename}`;

    // ✅ uploads tablosuna kaydet
    const { originalname, mimetype, size } = req.file;
    const [r1] = await pool.query(
      "INSERT INTO uploads (original_name, mime, size, url) VALUES (?, ?, ?, ?)",
      [originalname || null, mimetype || null, size || null, url]
    );

    return res.json({ id: r1.insertId, url });
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    return res.status(500).json({ error: "upload_insert_failed" });
  }
});

export default r;
