// server/src/routes/settings.js
import { Router } from "express";
import { pool } from "../db.js";
import multer from "multer";
import fs from "fs";
import path from "path";

const r = Router();
const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
const ABS = (p) => path.join(process.cwd(), p);
const BASE = process.env.BASE_URL || "";

const exts = [".png", ".jpg", ".jpeg", ".svg", ".ico", ".webp"];

async function ensureSettingsRow() {
  await pool.query(`
    INSERT INTO site_settings (id, site_name, logo_url, home_photo_url)
    VALUES (1, 'Budu', NULL, NULL)
    ON DUPLICATE KEY UPDATE site_name = site_name
  `);
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}
function cleanFolder(dir) {
  if (fs.existsSync(dir))
    for (const f of fs.readdirSync(dir))
      try {
        fs.unlinkSync(path.join(dir, f));
      } catch {}
}
function extFrom(mime, original) {
  const map = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/svg+xml": ".svg",
    "image/x-icon": ".ico",
    "image/webp": ".webp",
  };
  return map[mime] || (path.extname(original) || ".png").toLowerCase();
}
function findSlotUrl(slot) {
  const folder = slot === "logo" ? "logo" : "photo";
  const base = slot === "logo" ? "BUDULogo" : "BUDUphoto";
  for (const e of exts) {
    const p = ABS(path.join(UPLOAD_DIR, folder, `${base}${e}`));
    if (fs.existsSync(p)) return `${BASE}/uploads/${folder}/${base}${e}`;
  }
  return "";
}

/* ---------- ADMIN GET (formu doldur) ---------- */
r.get("/", async (_req, res) => {
  await ensureSettingsRow();
  const [rows] = await pool.query(
    "SELECT site_name, logo_url, home_photo_url FROM site_settings WHERE id=1"
  );
  const s = rows[0] || { site_name: "Budu", logo_url: "", home_photo_url: "" };
  const diskLogo = findSlotUrl("logo");
  const diskPhoto = findSlotUrl("photo");
  res.json({
    site_name: s.site_name || "Budu",
    logo_url: diskLogo || s.logo_url || "",
    home_photo_url: diskPhoto || s.home_photo_url || "",
  });
});

/* ---------- SADECE site_name UPSERT ---------- */
r.put("/", async (req, res) => {
  const { site_name } = req.body || {};
  if (!site_name) return res.status(400).json({ error: "site_name required" });
  await pool.query(
    `
    INSERT INTO site_settings (id, site_name)
    VALUES (1, ?)
    ON DUPLICATE KEY UPDATE site_name = VALUES(site_name), updatedAt = NOW()
  `,
    [site_name]
  );
  res.json({ ok: true });
});

/* ---------- YÜKLE: /api/settings/upload?slot=logo|photo (tek dosya kuralı) ---------- */
const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const folder = String(req.query.slot) === "logo" ? "logo" : "photo";
    const dir = ABS(path.join(UPLOAD_DIR, folder));
    ensureDir(dir);
    cleanFolder(dir);
    cb(null, dir);
  },
  filename(req, file, cb) {
    const base = String(req.query.slot) === "logo" ? "BUDULogo" : "BUDUphoto";
    cb(null, base + extFrom(file.mimetype, file.originalname));
  },
});
function fileFilter(_req, file, cb) {
  const ok = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/svg+xml",
    "image/webp",
    "image/x-icon",
  ].includes(file.mimetype);
  cb(ok ? null : new Error("invalid mime"), ok);
}
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

r.post("/upload", upload.single("file"), async (req, res) => {
  try {
    await ensureSettingsRow();
    const slot = String(req.query.slot) === "logo" ? "logo" : "photo";
    const col = slot === "logo" ? "logo_url" : "home_photo_url";
    const url = `${BASE}/uploads/${slot}/${req.file.filename}`;

    await pool.query(
      `
      INSERT INTO site_settings (id, ${col})
      VALUES (1, ?)
      ON DUPLICATE KEY UPDATE ${col} = VALUES(${col}), updatedAt = NOW()
    `,
      [url]
    );

    res.json({ url });
  } catch (e) {
    console.error("SETTINGS UPLOAD ERROR:", e);
    res.status(500).json({ error: "settings_upload_failed" });
  }
});

export default r;
