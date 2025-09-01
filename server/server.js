// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const ms = require("ms");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { customAlphabet } = require("nanoid");
const mime = require("mime-types");

const {
  PORT = 1002,
  CLIENT_ORIGIN = "http://localhost:1001",
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASS,
  DB_NAME,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  ACCESS_TTL = "10m",
  REFRESH_TTL = "30d",
} = process.env;

// --- DB pool ---
const pool = mysql.createPool({
  host: DB_HOST,
  port: Number(DB_PORT || 3306),
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  connectionLimit: 10,
  charset: "utf8mb4_unicode_ci",
});

// --- helpers ---
const isBcrypt = (s) => typeof s === "string" && /^\$2[aby]\$/.test(s);
const signAccess = (payload) =>
  jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: ACCESS_TTL });
const signRefresh = (payload) =>
  jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TTL });
const verifyAccess = (t) => jwt.verify(t, JWT_ACCESS_SECRET);
const verifyRefresh = (t) => jwt.verify(t, JWT_REFRESH_SECRET);

// tiny auth mw
function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Yetkisiz" });
    req.user = verifyAccess(token);
    next();
  } catch {
    return res.status(401).json({ error: "Yetkisiz" });
  }
}

// --- app ---
const app = express();
app.use(express.json());
app.use(cookieParser());

function assertId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Geçersiz id" });
  }
  next();
}

// CORS (credentials + dev allowlist)
const allowlist = new Set([
  CLIENT_ORIGIN,
  "http://localhost:1001",
  "http://127.0.0.1:1001",
]);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || [...allowlist].some((o) => o === origin)) cb(null, true);
      else cb(null, false);
    },
    credentials: true,
  })
);

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 16);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const extByName = path.extname(file.originalname).replace(".", "");
    const extByMime = mime.extension(file.mimetype) || "";
    const ext = (extByName || extByMime || "bin").toLowerCase();
    cb(null, `${Date.now()}-${nanoid()}.${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const UPLOAD_DIR = path.resolve(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use(
  "/uploads",
  express.static(UPLOAD_DIR, { maxAge: "365d", immutable: true })
);

// health
app.get("/health", (_req, res) => res.json({ ok: true }));

// AUTHS
app.post("/api/auth/login", async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body || {};
    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: "Eksik alan" });
    }

    const [rows] = await pool.query(
      "SELECT id, username, email, password, create_at FROM users WHERE username = ? OR email = ? LIMIT 1",
      [emailOrUsername, emailOrUsername]
    );

    if (!rows.length) return res.status(401).json({ error: "Geçersiz kimlik" });
    const user = rows[0];

    // parola kontrolü (plain veya bcrypt)
    let ok = false;
    if (isBcrypt(user.password))
      ok = bcrypt.compareSync(password, user.password);
    else ok = password === user.password;

    if (!ok) return res.status(401).json({ error: "Geçersiz kimlik" });

    // otomatik bcrypt migrasyon (plain ise)
    if (!isBcrypt(user.password)) {
      const hash = bcrypt.hashSync(user.password, 10);
      await pool.query("UPDATE users SET password = ? WHERE id = ?", [
        hash,
        user.id,
      ]);
    }

    const access = signAccess({ sub: user.id, username: user.username });
    const refresh = signRefresh({ sub: user.id });

    res.cookie("refresh", refresh, {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // prod: true
      maxAge: ms(REFRESH_TTL),
    });

    res.json({ access });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.post("/api/auth/refresh", async (req, res) => {
  try {
    const token = req.cookies?.refresh;
    if (!token) return res.status(401).json({ error: "Yenileme yok" });
    const payload = verifyRefresh(token);
    const access = signAccess({ sub: payload.sub });
    res.json({ access });
  } catch {
    return res.status(401).json({ error: "Geçersiz yenileme" });
  }
});

app.post("/api/auth/logout", async (_req, res) => {
  res.clearCookie("refresh");
  res.json({ ok: true });
});

app.get("/api/auth/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Yetkisiz" });
    const payload = verifyAccess(token);

    const [rows] = await pool.query(
      "SELECT id, username, email, create_at FROM users WHERE id = ? LIMIT 1",
      [payload.sub]
    );
    if (!rows.length) return res.status(401).json({ error: "Yetkisiz" });

    res.json({ user: rows[0] });
  } catch {
    return res.status(401).json({ error: "Token geçersiz" });
  }
});

// PUBLIC: PAGES & POSTS & CONTACT
app.get("/api/public/posts", async (req, res) => {
  try {
    const page = String(req.query.page || "").trim(); // pages.key_slug
    const q = String(req.query.q || "").trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const where = [
      `p.status='published'`,
      `p.visibility='public'`,
      `p.published_at IS NOT NULL`,
      `p.published_at <= NOW()`,
    ];
    const params = [];

    if (page) {
      where.push(`EXISTS (
        SELECT 1 FROM post_pages pp
        JOIN pages pg ON pg.id = pp.page_id
        WHERE pp.post_id = p.id AND pg.key_slug = ?
      )`);
      params.push(page);
    }
    if (q) {
      where.push(`(p.title LIKE ? OR p.excerpt LIKE ? OR p.content_md LIKE ?)`);
      const like = `%${q}%`;
      params.push(like, like, like);
    }

    const sql = `SELECT p.id, p.title, p.slug, p.cover_url, p.excerpt, p.published_at, p.created_at, p.updated_at, p.pinned
       FROM posts p
       WHERE ${where.join(" AND ")}
       ORDER BY p.pinned DESC, p.published_at DESC, p.id DESC
       LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.query(sql, params);
    res.json({ list: rows, limit, offset, page, q });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Detay: /api/public/posts/:slug (yalnız published & public)
app.get("/api/public/posts/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim();
    const [rows] = await pool.query(
      `SELECT p.id, p.title, p.slug, p.cover_url, p.excerpt, p.content_md, p.published_at, p.created_at, p.updated_at
       FROM posts p
       WHERE p.slug = ? AND p.status='published' AND p.visibility='public' AND p.published_at IS NOT NULL AND p.published_at <= NOW()
       LIMIT 1`,
      [slug]
    );
    if (!rows.length) return res.status(404).json({ error: "Bulunamadı" });
    res.json({ item: rows[0] });
  } catch {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.post("/api/public/email", async (req, res) => {
  try {
    let { name, email, subject, message } = req.body || {};
    name = String(name || "").trim();
    email = String(email || "").trim();
    subject = String(subject || "").trim();
    message = String(message || "").trim();

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "Eksik alan" });
    }
    if (name.length > 100 || email.length > 191 || subject.length > 191) {
      return res.status(400).json({ error: "Alan uzunluğu aşıldı" });
    }
    // basit email kontrolü
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "E-posta geçersiz" });
    }

    const [result] = await pool.query(
      "INSERT INTO messages (name, email, subject, message) VALUES (?,?,?,?)",
      [name, email, subject, message]
    );
    res.status(201).json({ ok: true, id: result.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.post(
  "/api/admin/upload",
  requireAuth,
  upload.single("file"),
  (req, res) => {
    const f = req.file;
    if (!f) return res.status(400).json({ error: "Dosya yok" });
    const publicPath = `/uploads/${f.filename}`;
    const fullUrl = `${req.protocol}://${req.get("host")}${publicPath}`;
    res.status(201).json({
      ok: true,
      path: publicPath, // istemcide: `${API_BASE}${path}`
      url: fullUrl,
      name: f.originalname,
      size: f.size,
      type: f.mimetype,
    });
  }
);

app.get("/api/admin/pages", requireAuth, async (_req, res) => {
  const [rows] = await pool.query(
    "SELECT id, key_slug, title, path FROM pages ORDER BY sort ASC"
  );
  res.json({ pages: rows });
});

// Liste: /api/admin/posts?status=all|draft|published|archived|scheduled&q=...
app.get("/api/admin/posts", requireAuth, async (req, res) => {
  try {
    const status = String(req.query.status || "all");
    const q = String(req.query.q || "").trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const where = [];
    const params = [];
    if (status !== "all") {
      where.push("p.status = ?");
      params.push(status);
    }
    if (q) {
      where.push("(p.title LIKE ? OR p.excerpt LIKE ? OR p.content_md LIKE ?)");
      const like = `%${q}%`;
      params.push(like, like, like);
    }

    let sql = `SELECT p.id, p.title, p.slug, p.status, p.visibility, p.pinned, p.published_at, p.updated_at
               FROM posts p`;
    if (where.length) sql += ` WHERE ` + where.join(" AND ");
    sql += ` ORDER BY p.updated_at DESC, p.id DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.query(sql, params);
    res.json({ list: rows, limit, offset, status, q });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

function toMysqlDatetime(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

app.post("/api/admin/posts/save", requireAuth, async (req, res) => {
  const {
    id,
    title,
    slug,
    cover_url,
    excerpt,
    content_md,
    status = "draft",
    visibility = "public",
    pinned = 0,
    published_at = null,
    page_ids = [],
  } = req.body || {};

  if (!title || !slug || !content_md) {
    return res.status(400).json({ error: "Eksik alan" });
  }

  // yayınlıysa ve tarih verilmemişse şimdi
  let pub = published_at;
  if (status === "published" && !pub) pub = toMysqlDatetime(new Date());

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (!id) {
      const [r] = await conn.query(
        `INSERT INTO posts (author_id,title,slug,cover_url,excerpt,content_md,status,visibility,pinned,published_at)
         VALUES (NULL,?,?,?,?,?,?,?,?,?)`,
        [
          title,
          slug,
          cover_url || null,
          excerpt || null,
          content_md,
          status,
          visibility,
          pinned ? 1 : 0,
          pub, // olabilir: NULL ya da 'YYYY-mm-dd HH:MM:SS'
        ]
      );
      const newId = r.insertId;

      if (Array.isArray(page_ids) && page_ids.length) {
        const values = page_ids.map((pid) => [newId, pid]);
        await conn.query(`INSERT INTO post_pages (post_id, page_id) VALUES ?`, [
          values,
        ]);
      }

      await conn.commit();
      return res.status(201).json({ ok: true, id: newId });
    } else {
      await conn.query(
        `UPDATE posts SET title=?, slug=?, cover_url=?, excerpt=?, content_md=?, status=?, visibility=?, pinned=?, published_at=?
         WHERE id=?`,
        [
          title,
          slug,
          cover_url || null,
          excerpt || null,
          content_md,
          status,
          visibility,
          pinned ? 1 : 0,
          pub, // not: published değilse ve null ise null kalır
          id,
        ]
      );

      await conn.query(`DELETE FROM post_pages WHERE post_id=?`, [id]);
      if (Array.isArray(page_ids) && page_ids.length) {
        const values = page_ids.map((pid) => [id, pid]);
        await conn.query(`INSERT INTO post_pages (post_id, page_id) VALUES ?`, [
          values,
        ]);
      }

      await conn.commit();
      return res.json({ ok: true, id });
    }
  } catch (e) {
    await conn.rollback();
    console.error(e);
    return res
      .status(e && e.code === "ER_DUP_ENTRY" ? 409 : 500)
      .json({
        error:
          e && e.code === "ER_DUP_ENTRY" ? "Slug zaten var" : "Sunucu hatası",
      });
  } finally {
    conn.release();
  }
});

// Tekil getir (admin)
app.get("/api/admin/posts/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [rows] = await pool.query(`SELECT * FROM posts WHERE id=?`, [id]);
  if (!rows.length) return res.status(404).json({ error: "Bulunamadı" });

  const [maps] = await pool.query(
    `SELECT page_id FROM post_pages WHERE post_id=?`,
    [id]
  );
  res.json({ item: rows[0], page_ids: maps.map((r) => r.page_id) });
});

// Sil
app.delete("/api/admin/posts/:id", requireAuth, async (req, res) => {
  await pool.query(`DELETE FROM posts WHERE id=?`, [Number(req.params.id)]);
  res.json({ ok: true });
});
// !

// ADMIN: MESSAGES
app.get("/api/messages/stats", requireAuth, async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN is_archived = 0 AND is_read = 0 THEN 1 ELSE 0 END) AS unread,
        SUM(CASE WHEN is_archived = 0 AND is_read = 1 THEN 1 ELSE 0 END) AS read_count,
        SUM(CASE WHEN is_archived = 1 THEN 1 ELSE 0 END) AS archived
      FROM messages
    `);
    const r = rows[0] || { total: 0, unread: 0, read_count: 0, archived: 0 };
    res.json({
      total: Number(r.total) || 0,
      unread: Number(r.unread) || 0,
      read: Number(r.read_count) || 0,
      archived: Number(r.archived) || 0,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.get("/api/messages", requireAuth, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const status = String(req.query.status || "all"); // unread|read|archived|all
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 500);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const where = [];
    const params = [];

    if (status === "unread") where.push("is_read = 0 AND is_archived = 0");
    else if (status === "read") where.push("is_read = 1 AND is_archived = 0");
    else if (status === "archived") where.push("is_archived = 1");
    // all -> filtre yok

    if (q) {
      where.push(
        "(name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?)"
      );
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }

    let sql =
      "SELECT id, name, email, subject, message, is_read, is_archived, created_at FROM messages";
    if (where.length) sql += " WHERE " + where.join(" AND ");
    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [rows] = await pool.query(sql, params);
    res.json({ list: rows, limit, offset, q, status });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Detay
app.get("/api/messages/:id", requireAuth, assertId, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [rows] = await pool.query(
      "SELECT id, name, email, subject, message, is_read, is_archived, created_at FROM messages WHERE id = ?",
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: "Bulunamadı" });
    res.json({ item: rows[0] });
  } catch {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Okundu/okunmadı
app.patch("/api/messages/:id/read", requireAuth, assertId, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const read = req.body?.read ? 1 : 0;
    await pool.query("UPDATE messages SET is_read = ? WHERE id = ?", [
      read,
      id,
    ]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Arşivle / Arşivden çıkar
app.patch(
  "/api/messages/:id/archive",
  requireAuth,
  assertId,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const archived = req.body?.archived ? 1 : 0;
      await pool.query("UPDATE messages SET is_archived = ? WHERE id = ?", [
        archived,
        id,
      ]);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Sunucu hatası" });
    }
  }
);

// Sil
app.delete("/api/messages/:id", requireAuth, assertId, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await pool.query("DELETE FROM messages WHERE id = ?", [id]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// 404
app.use((_req, res) => res.status(404).json({ error: "Not Found" }));

// start
app.listen(Number(PORT), () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
