import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db.js";
import { requireAuth } from "./middlewares/auth.js";
import authRouter from "./routes/auth.js";
import settingsRouter from "./routes/settings.js";
import usersRouter from "./routes/users.js";
import pagesRouter from "./routes/pages.js";
import uploadRouter from "./routes/upload.js";
import fs from "fs";
import path from "path";
const app = express();

const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
const ABS = (p) => path.join(process.cwd(), p);
const BASE = process.env.BASE_URL || "";
const exts = [".png", ".jpg", ".jpeg", ".svg", ".ico", ".webp"];
function findSlotUrl(slot) {
  const folder = slot === "logo" ? "logo" : "photo";
  const base = slot === "logo" ? "BUDULogo" : "BUDUphoto";
  for (const e of exts) {
    const p = ABS(path.join(UPLOAD_DIR, folder, `${base}${e}`));
    if (fs.existsSync(p)) return `${BASE}/uploads/${folder}/${base}${e}`;
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

dotenv.config();
app.use(express.json());
// app.use("/uploads", express.static(process.env.UPLOAD_DIR || "uploads"));
const ORIGIN = process.env.FRONTEND_ORIGIN || "http://192.168.1.120:1001";

const allow = [
  process.env.FRONTEND_ORIGIN || "http://192.168.1.120:1001",
  "http://localhost:5173",
  "http://192.168.1.120:5173",
];

app.use(
  cors({
    origin: allow, // '*' OLAMAZ
    credentials: true, // 🔵 credentials açık
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("/uploads", express.static(process.env.UPLOAD_DIR || "uploads"));

/* ---- public ---- */
app.use("/api/settings", requireAuth("admin"), settingsRouter);

app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/api/public/settings", async (_req, res) => {
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
app.get("/api/public/menu", async (_req, res) => {
  const [rows] = await pool.query(
    "SELECT title, path FROM pages WHERE is_active=1 AND show_in_menu=1 ORDER BY order_index ASC"
  );
  res.json(rows);
});

/* ---- auth ---- */
app.use("/api/auth", authRouter);

/* ---- protected ---- */
app.use("/api/users", requireAuth("admin"), usersRouter);
app.use("/api/pages", requireAuth("admin"), pagesRouter);
app.use("/api/upload", requireAuth(), uploadRouter);

const PORT = Number(process.env.PORT || 1002);
app.listen(PORT, () => console.log(`BUDU API running on :${PORT}`));
