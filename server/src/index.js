// server/src/index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import cookieParser from "cookie-parser";

import { pool } from "./db.js";
import { requireAuth } from "./middlewares/auth.js";
import authRouter from "./routes/auth.js";
import settingsRouter from "./routes/settings.js";
import usersRouter from "./routes/users.js";
import pagesRouter from "./routes/pages.js";
import uploadRouter from "./routes/upload.js";

const app = express();

const ROOT = process.cwd();
const UPLOAD_DIR = path.resolve(ROOT, "uploads");
const PORT = Number(process.env.PORT || 1002);

// uploads klasörü garanti
try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch {
  /* no-op */
}

// ---------- yardımcılar ----------
const exts = [".png", ".jpg", ".jpeg", ".svg", ".webp", ".ico"];

function findSlotPath(slot) {
  const folder = slot === "logo" ? "logo" : "photo";
  const base = slot === "logo" ? "BUDULogo" : "BUDUphoto";
  for (const e of exts) {
    const p = path.join(UPLOAD_DIR, folder, `${base}${e}`);
    if (fs.existsSync(p)) return `/uploads/${folder}/${base}${e}`;
  }
  return "";
}

async function ensureSettingsRow() {
  await pool.query(`
    INSERT INTO site_settings (id, site_name, logo_url, home_photo_url)
    VALUES (1, 'Budu', NULL, NULL)
    ON DUPLICATE KEY UPDATE site_name = site_name
  `);
}

const toAbs = (req, p) => (p ? `${req.protocol}://${req.get("host")}${p}` : "");
const ensureAbs = (req, url) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return toAbs(req, url);
};

// ---------- SIRA ÖNEMLİ ----------

// 1) Static uploads
app.use(
  "/uploads",
  express.static(UPLOAD_DIR, {
    index: false,
    etag: true,
    immutable: true,
    maxAge: "30d",
  })
);

// 2) Cookie parser
app.use(cookieParser());

// 3) JSON body
app.use(express.json());

// 4) CORS
const ALLOWLIST = [
  process.env.FRONTEND_ORIGIN,
  "http://192.168.1.112:1001",
  "http://192.168.1.112:5173",
  "http://localhost:1001",
  "http://localhost:5173",
].filter(Boolean);

app.use((req, res, next) => {
  res.header("Vary", "Origin");
  next();
});

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (ALLOWLIST.includes(origin)) return cb(null, true);
      return cb(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true, // Cookie'ler için ÖNEMLİ
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ---------- PUBLIC ----------
app.get("/api/public/settings", async (req, res) => {
  await ensureSettingsRow();
  const [rows] = await pool.query(
    "SELECT site_name, logo_url, home_photo_url FROM site_settings WHERE id=1"
  );
  const s = rows[0] || { site_name: "Budu", logo_url: "", home_photo_url: "" };

  const diskLogo = findSlotPath("logo");
  const diskPhoto = findSlotPath("photo");

  res.json({
    site_name: s.site_name || "Budu",
    logo_url: diskLogo
      ? toAbs(req, diskLogo)
      : ensureAbs(req, s.logo_url || ""),
    home_photo_url: diskPhoto
      ? toAbs(req, diskPhoto)
      : ensureAbs(req, s.home_photo_url || ""),
  });
});

app.get("/api/public/menu", async (_req, res) => {
  const [rows] = await pool.query(
    "SELECT title, path FROM pages WHERE is_active=1 AND show_in_menu=1 ORDER BY order_index ASC"
  );
  res.json(rows);
});

// ---------- AUTH & PROTECTED ----------
app.use("/api/auth", authRouter);
app.use("/api/settings", requireAuth("admin"), settingsRouter);
app.use("/api/users", requireAuth("admin"), usersRouter);
app.use("/api/pages", requireAuth("admin"), pagesRouter);
app.use("/api/upload", requireAuth(), uploadRouter);

// ---------- SPA CATCH-ALL ----------
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  res.sendFile(path.resolve(ROOT, "client", "dist", "index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`BUDU API running on :${PORT}`);
});
