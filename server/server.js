require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { randomBytes } = require("node:crypto");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const ms = require("ms");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { customAlphabet } = require("nanoid");
const mime = require("mime-types");
const app = express();

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

const pool = mysql.createPool({
  host: DB_HOST,
  port: Number(DB_PORT || 3306),
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  connectionLimit: 10,
  charset: "utf8mb4_unicode_ci",
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USER_RE = /^[a-zA-Z0-9_.-]{3,64}$/;
const NAME_RE = /^[\p{L}\s-]+$/u;

const COURSES_DIR = path.join(__dirname, "courses", "video");
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:1001";
const COURSES_ROOT = path.join(__dirname, "courses");
const COURSES_VIDEO_DIR = path.join(COURSES_ROOT, "video");
const MAX_VIDEO_MB = Number(process.env.MAX_VIDEO_MB || 1024);
const UPLOAD_DIR = path.resolve(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// --- helpers ---
const isBcrypt = (s) => typeof s === "string" && /^\$2[aby]\$/.test(s);
const signAccess = (payload) =>
  jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: ACCESS_TTL });
const signRefresh = (payload) =>
  jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TTL });
const verifyAccess = (t) => jwt.verify(t, JWT_ACCESS_SECRET);
const verifyRefresh = (t) => jwt.verify(t, JWT_REFRESH_SECRET);
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
fs.mkdirSync(COURSES_VIDEO_DIR, { recursive: true });

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

const ALLOWED_VIDEO = new Map([
  ["video/mp4", ".mp4"],
  ["video/webm", ".webm"],
  ["video/quicktime", ".mov"],
  ["video/x-matroska", ".mkv"],
]);

const storageForVid = multer.diskStorage({
  destination: (req, file, cb) => cb(null, COURSES_VIDEO_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || "").toLowerCase();
    const titleSlug = slugify(req.body?.title || file.originalname);
    const rand = randomBytes(5).toString("hex"); // <-- artık doğru
    cb(null, `${Date.now()}_${titleSlug}_${rand}${ext}`);
  },
});

const uploadForVid = multer({
  storage: storageForVid, // <-- DÜZELTİLDİ
  limits: { fileSize: MAX_VIDEO_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ALLOWED_VIDEO.has(file.mimetype);
    if (!ok) return cb(new Error("Yalnızca mp4/webm/mov/mkv kabul edilir."));
    cb(null, true);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.sendStatus(204);
  }
  next();
});

function cookieOpts(maxAgeMs) {
  const isProd = process.env.NODE_ENV === "production";
  // Farklı origin kullanıyorsan SameSite=None gerekir (Chrome).
  const crossSite = true; // front ve api farklı origin/port ise true kalsın
  return {
    httpOnly: true,
    secure: isProd || crossSite, // localde de secure:true olmalıysa crossSite kontrolü ekle
    sameSite: crossSite ? "none" : "lax",
    maxAge: maxAgeMs,
    path: "/",
  };
}

async function getUserById(id) {
  const [rows] = await pool.query(
    "SELECT id, username, email, role, COALESCE(is_active,1) AS is_active FROM users WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

app.use(
  "/uploads",
  express.static(UPLOAD_DIR, { maxAge: "365d", immutable: true })
);

app.use(
  "/courses",
  express.static(COURSES_ROOT, {
    fallthrough: false,
    // Cache ayarı: dosya adları benzersiz => uzun cache güvenli
    maxAge: "30d",
    setHeaders(res, filePath) {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cross-Origin-Resource-Policy", "same-site");
      // video ise inline oynatılabilir
      if (/\.(mp4|webm|mov|mkv)$/i.test(filePath)) {
        res.setHeader("Content-Disposition", "inline");
      }
    },
  })
);

function isEmail(x) {
  return EMAIL_RE.test(String(x || "").toLowerCase());
}

function ensureAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin gerekli" });
  }
  next();
}

async function requireAuth(req, res, next) {
  try {
    const a = req.cookies?.access;
    if (a) {
      try {
        const ap = verifyAccess(a);
        req.user = await getUserById(ap.sub);
        if (!req.user) return res.status(401).json({ error: "Yetkisiz" });
        return next();
      } catch {
        /* access süresi dolmuş olabilir, refresh dene */
      }
    }

    const r = req.cookies?.refresh;
    if (!r) return res.status(401).json({ error: "Yetkisiz" });
    const rp = verifyRefresh(r);
    const u = await getUserById(rp.sub);
    if (!u) return res.status(401).json({ error: "Yetkisiz" });
    if (Number(u.is_active) === 0) {
      res.clearCookie("access", cookieOpts(0));
      res.clearCookie("refresh", cookieOpts(0));
      return res.status(403).json({ error: "Hesap pasif" });
    }

    // yeni access bas
    const access = signAccess({ sub: u.id, role: u.role });
    res.cookie(
      "access",
      access,
      cookieOpts(ms(process.env.ACCESS_TTL || "10m"))
    );
    req.user = u;
    return next();
  } catch {
    return res.status(401).json({ error: "Yetkisiz" });
  }
}

function assertId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Geçersiz id" });
  }
  next();
}

function slugify(s) {
  return (
    String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60) || "video"
  );
}

function safeJoin(root, rel) {
  // rel: "/courses/video/xxx.mp4" gibi bir url gelebilir
  const cleaned = String(rel || "")
    .replace(/^\/+courses\/+/i, "")
    .replace(/^\/+/, "");
  const abs = path.join(root, cleaned);
  if (!abs.startsWith(root)) throw new Error("Path traversal engellendi");
  return abs;
}

function ensureAdmin(req, res, next) {
  if (req.user && (req.user.role === "admin" || req.user.role === "editor"))
    return next();
  return res.status(403).json({ error: "Yasak" });
}

function parseKey(emailOrUsername = "") {
  const key = String(emailOrUsername || "")
    .trim()
    .toLowerCase();
  if (EMAIL_RE.test(key)) return { col: "email", val: key };
  if (USER_RE.test(key)) return { col: "username", val: key };
  // e-posta değilse kullanıcı adı gibi davran
  return { col: "username", val: key };
}

function verifyPlayToken(req, res, next) {
  try {
    const t = req.query.token;
    const p = jwt.verify(String(t || ""), JWT_SECRET);
    if (!p || !p.uid) return res.status(401).end();
    req.play = p;
    next();
  } catch {
    return res.status(401).end();
  }
}

function toMysqlDatetime(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function normalizeDial(s = "") {
  s = String(s || "").trim();
  if (!s) return "";
  if (!s.startsWith("+")) s = "+" + s.replace(/^\+?0+/, "");
  return s.replace(/\s/g, "");
}
function normalizePhone(s = "") {
  s = String(s || "")
    .trim()
    .replace(/\D/g, "");
  return s;
}

function s(x) {
  return (x ?? "").toString().trim();
}

function parseIdentifier(src) {
  const b = src || {};
  let v = b.emailOrUsername ?? b.email ?? b.username ?? "";
  v = String(v || "").trim();
  if (!v) return { kind: null, value: "" };

  const lower = v.toLowerCase();

  // EMAIL_RE / USER_RE zaten dosyada varsa onları kullan; yoksa basit fallback
  const looksEmail =
    (typeof EMAIL_RE !== "undefined" && EMAIL_RE.test(lower)) ||
    lower.includes("@");

  if (looksEmail) {
    return { kind: "email", value: lower };
  }

  const usernameOk =
    (typeof USER_RE !== "undefined" && USER_RE.test(lower)) ||
    lower.length >= 3;

  if (usernameOk) {
    return { kind: "username", value: lower };
  }

  return { kind: null, value: "" };
}

// health
app.get("/health", (_req, res) => res.json({ ok: true }));

app.post(
  "/api/auth/login",
  wrap(async (req, res) => {
    const { emailOrUsername, password, remember } = req.body || {};
    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: "Eksik bilgi" });
    }

    const { col, val } = parseKey(emailOrUsername);
    const [rows] = await pool.query(
      `SELECT id, username, email, role, COALESCE(is_active,1) AS is_active, password
     FROM users WHERE ${col} = ? LIMIT 1`,
      [val]
    );
    const u = rows?.[0];
    if (!u) return res.status(401).json({ error: "Geçersiz bilgiler" });

    const ok = isBcrypt(u.password)
      ? await bcrypt.compare(password, u.password)
      : String(u.password) === String(password); // nadiren düz parola kalmış olabilir (dev)
    if (!ok) return res.status(401).json({ error: "Geçersiz bilgiler" });

    if (Number(u.is_active) === 0) {
      return res.status(403).json({ error: "Hesap pasif" });
    }

    // JWT üret
    const payload = { sub: u.id, role: u.role };
    const access = signAccess(payload);
    const refresh = signRefresh(payload);

    // Çerezlere yaz (httpOnly + crossSite uyumlu)
    const accessMs = ms(process.env.ACCESS_TTL || "10m");
    const refreshMs = ms(process.env.REFRESH_TTL || "30d");
    res.cookie("access", access, cookieOpts(accessMs));
    res.cookie("refresh", refresh, cookieOpts(refreshMs));

    // frontend geriye user istiyor; token opsiyonel (legacy)
    res.json({
      user: {
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        is_active: u.is_active,
      },
      token: access,
    });
  })
);

app.get(
  "/api/auth/me",
  wrap(async (req, res) => {
    // 1) httpOnly access cookie
    let token = req.cookies?.access;

    // 2) Geriye dönük destek: Authorization: Bearer ...
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) return res.status(401).json({ error: "Yetkisiz" });

    try {
      const p = verifyAccess(token);
      const u = await getUserById(p.sub);
      if (!u) return res.status(401).json({ error: "Yetkisiz" });
      return res.json({ user: u });
    } catch {
      return res.status(401).json({ error: "Yetkisiz" });
    }
  })
);

app.post(
  "/api/auth/refresh",
  wrap(async (req, res) => {
    const r = req.cookies?.refresh;
    if (!r) return res.status(401).json({ error: "Yetkisiz" });

    try {
      const rp = verifyRefresh(r);
      const u = await getUserById(rp.sub);
      if (!u) return res.status(401).json({ error: "Yetkisiz" });

      const payload = { sub: u.id, role: u.role };
      const access = signAccess(payload);
      const accessMs = ms(process.env.ACCESS_TTL || "10m");
      res.cookie("access", access, cookieOpts(accessMs));
      return res.json({ ok: true, token: access });
    } catch {
      res.clearCookie("access", cookieOpts(0));
      res.clearCookie("refresh", cookieOpts(0));
      return res.status(401).json({ error: "Yetkisiz" });
    }
  })
);

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("access", cookieOpts(0));
  res.clearCookie("refresh", cookieOpts(0));
  res.json({ ok: true });
});

app.post(
  "/api/customers/register",
  wrap(async (req, res) => {
    const {
      username = "",
      email = "",
      password = "",
      fname = "",
      sname = "",
      country_dial = "",
      phone = "",
    } = req.body || {};

    const u = String(username).trim();
    const e = String(email).trim().toLowerCase();
    const p = String(password);

    if (!USER_RE.test(u)) {
      return res
        .status(400)
        .json({ error: "Geçersiz kullanıcı adı (3–64, harf/rakam/_/. )" });
    }
    if (!EMAIL_RE.test(e)) {
      return res.status(400).json({ error: "Geçersiz e-posta" });
    }
    if (p.length < 6 || p.length > 72) {
      return res.status(400).json({ error: "Parola 6–72 karakter olmalı" });
    }

    const dial = normalizeDial(country_dial);
    const phoneDigits = normalizePhone(phone);
    if (phoneDigits && (phoneDigits.length < 6 || phoneDigits.length > 16)) {
      return res.status(400).json({ error: "Telefon 6–16 hane olmalı" });
    }
    if (phoneDigits && !dial) {
      return res
        .status(400)
        .json({ error: "Telefon girildiyse ülke kodu gerekli" });
    }

    // benzersizlik kontrolü
    const [dups] = await pool.query(
      "SELECT username, email FROM customers WHERE username = ? OR email = ? LIMIT 1",
      [u, e]
    );
    if (dups.length) {
      const taken = dups[0];
      if (taken.username === u)
        return res.status(409).json({ error: "Kullanıcı adı kullanılıyor" });
      if (taken.email === e)
        return res.status(409).json({ error: "E-posta kullanılıyor" });
    }

    const hash = await bcrypt.hash(p, 10);

    // kaydet
    const [ins] = await pool.query(
      `INSERT INTO customers
     (username, email, password, fname, sname, country_dial, phone)
     VALUES (?,?,?,?,?,?,?)`,
      [
        u,
        e,
        hash,
        String(fname || "").trim(),
        String(sname || "").trim(),
        dial || null,
        phoneDigits || null,
      ]
    );

    return res.status(201).json({
      ok: true,
      customer: { id: ins.insertId, username: u, email: e },
    });
  })
);

// Müşteri girişi (customers)
app.post("/api/customers/login", async (req, res) => {
  try {
    // FE şu üç biçimden biriyle gönderir: {emailOrUsername} | {email} | {username}
    const idf = parseIdentifier(req.body); // { kind: 'email' | 'username' | null, value: string }
    const password = s(req.body?.password);
    const remember = !!req.body?.remember;

    if (!idf.kind || !idf.value || !password) {
      return res.status(400).json({ error: "Eksik alan" });
    }

    const col = idf.kind === "email" ? "email" : "username";
    const [rows] = await pool.execute(
      `SELECT id, username, email, password
         FROM customers
        WHERE ${col} = ?
        LIMIT 1`,
      [idf.value]
    );

    if (!Array.isArray(rows) || !rows.length) {
      return res.status(401).json({ error: "Geçersiz kimlik" });
    }

    const user = rows[0];
    const ok = /^\$2[aby]\$/.test(user.password)
      ? await bcrypt.compare(password, user.password)
      : password === user.password; // (eski düz kayıt varsa)

    if (!ok) return res.status(401).json({ error: "Geçersiz kimlik" });

    // JWT üret (payload minimal)
    const payload = { sub: user.id, role: "customer" };
    const token = signAccess(payload); // ACCESS_TTL'e göre imzalanır

    // İstersen çerez de set edebilirsin (opsiyonel):
    // res.cookie("access", token, {
    //   httpOnly: true, sameSite: "lax",
    //   secure: false, // prod'da true
    //   maxAge: remember ? ms(process.env.ACCESS_TTL || "10m") : undefined,
    // });

    return res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error("user-login error:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.get("/api/customers/user-me", async (req, res) => {
  try {
    // 1) Authorization: Bearer ... (FE token’ı storage’tan header’a koyuyor)
    let token = req.headers.authorization?.split(" ")[1];

    // 2) Geriye dönük cookie desteği (opsiyonel)
    if (!token && req.cookies?.access) token = req.cookies.access;

    if (!token) return res.status(401).json({ error: "Yetkisiz" });

    let payload;
    try {
      payload = verifyAccess(token);
    } catch {
      return res.status(401).json({ error: "Yetkisiz" });
    }

    const [rows] = await pool.execute(
      "SELECT id, username, email FROM customers WHERE id = ? LIMIT 1",
      [payload.sub]
    );
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(401).json({ error: "Yetkisiz" });
    }

    // wrapper YOK — doğrudan user dön
    return res.json(rows[0]);
  } catch (err) {
    console.error("user-me error:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.post("/api/customers/logout", (req, res) => {
  try {
    // Token client’ta storage’tan siliniyor; cookie kullandıysan ayrıca temizle:
    // res.clearCookie("access");
    return res.json({ ok: true });
  } catch {
    return res.json({ ok: true });
  }
});

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

// ADMIN • USERS – Liste
app.get(
  "/api/admin/users",
  requireAuth,
  wrap(async (req, res) => {
    // role=admin zorunlu değil; ama default admin listele
    const role = String(req.query.role || "admin").toLowerCase();
    const q = String(req.query.q || "").trim();

    const where = [];
    const params = [];
    if (role && ["admin", "editor", "user"].includes(role)) {
      where.push("role = ?");
      params.push(role);
    }
    if (q) {
      where.push("(username LIKE ? OR email LIKE ?)");
      params.push(`%${q}%`, `%${q}%`);
    }

    const sql = `
    SELECT id, username, email, role,
           COALESCE(is_active, 1) AS is_active,
           create_at
    FROM users
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY id DESC
    LIMIT 200
  `;
    const [rows] = await pool.query(sql, params);
    res.json({ list: rows });
  })
);

// NEW: Admin • USERS – Create
app.post(
  "/api/admin/users",
  requireAuth,
  wrap(async (req, res) => {
    // İstersen requireAuth yerine ensureAdmin kullan (rol kontrolü).
    const { username, email, password, role, is_active } = req.body || {};

    // basit doğrulama
    if (!username || !USER_RE.test(String(username)))
      return res.status(400).json({ error: "Geçersiz kullanıcı adı" });

    if (!email || !EMAIL_RE.test(String(email)))
      return res.status(400).json({ error: "Geçersiz e-posta" });

    if (!password || String(password).trim().length < 6)
      return res.status(400).json({ error: "Parola en az 6 karakter olmalı" });

    const r = (role || "admin").toString().toLowerCase();
    const allowed = ["admin", "editor", "user"];
    const finalRole = allowed.includes(r) ? r : "admin";

    const active = [1, "1", true, "true"].includes(is_active) ? 1 : 0;

    const hash = await bcrypt.hash(String(password).trim(), 10);

    try {
      const [ins] = await pool.query(
        `
      INSERT INTO users (username, email, password, role${
        /* is_active kolonu varsa ekleyelim */ ""
      }${typeof active === "number" ? ", is_active" : ""})
      VALUES (?, ?, ?, ?${typeof active === "number" ? ", ?" : ""})
      `,
        typeof active === "number"
          ? [username, email.toLowerCase(), hash, finalRole, active]
          : [username, email.toLowerCase(), hash, finalRole]
      );

      const id = ins.insertId;
      const [rows] = await pool.query(
        "SELECT id, username, email, role, COALESCE(is_active,1) AS is_active, create_at FROM users WHERE id = ? LIMIT 1",
        [id]
      );
      return res.status(201).json({ item: rows[0] });
    } catch (e) {
      // benzersiz kısıtlar
      if (e && e.code === "ER_DUP_ENTRY") {
        // hangi alan çakıştı söyle
        const msg = /users\.email/i.test(e.sqlMessage || "")
          ? "E-posta kullanımda"
          : /users\.username/i.test(e.sqlMessage || "")
          ? "Kullanıcı adı kullanımda"
          : "Zaten kayıtlı";
        return res.status(409).json({ error: msg });
      }
      // is_active kolonu yoksa fallback: kolonsuz tekrar dene
      if (e && e.code === "ER_BAD_FIELD_ERROR") {
        const [ins2] = await pool.query(
          `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`,
          [username, email.toLowerCase(), hash, finalRole]
        );
        const id2 = ins2.insertId;
        const [rows2] = await pool.query(
          "SELECT id, username, email, role, COALESCE(is_active,1) AS is_active, create_at FROM users WHERE id = ? LIMIT 1",
          [id2]
        );
        return res.status(201).json({ item: rows2[0] });
      }
      throw e;
    }
  })
);

// ADMIN • USERS – Tek kayıt
app.get(
  "/api/admin/users/:id",
  requireAuth,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ error: "Geçersiz id" });

    const [rows] = await pool.query(
      "SELECT id, username, email, role, COALESCE(is_active,1) AS is_active, create_at FROM users WHERE id = ? LIMIT 1",
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: "Bulunamadı" });
    res.json({ item: rows[0] });
  })
);

// ADMIN • USERS – Güncelle
app.patch(
  "/api/admin/users/:id",
  requireAuth,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ error: "Geçersiz id" });

    const { username, email, password, is_active } = req.body || {};
    const sets = [];
    const vals = [];

    if (username && USER_RE.test(username)) {
      sets.push("username = ?");
      vals.push(username);
    }
    if (email && isEmail(email)) {
      sets.push("email = ?");
      vals.push(email.toLowerCase());
    }
    if (typeof is_active !== "undefined") {
      // kolon yoksa hata fırlayabilir; aşağıda yakalayıp tekrar deneriz
      sets.push("is_active = ?");
      vals.push([1, "1", true, "true"].includes(is_active) ? 1 : 0);
    }
    if (password && String(password).trim().length >= 6) {
      const hash = await bcrypt.hash(String(password).trim(), 10);
      sets.push("password = ?");
      vals.push(hash);
    }

    if (sets.length === 0)
      return res.status(400).json({ error: "Güncellenecek alan yok" });

    const run = async (ignoreActiveCol = false) => {
      const finalSets = ignoreActiveCol
        ? sets.filter((s) => !/^is_active\s*=/.test(s))
        : sets;
      const finalVals = ignoreActiveCol
        ? vals.filter((_, i) => !/^is_active\s*=/.test(sets[i]))
        : vals;

      if (finalSets.length === 0) {
        // sadece is_active vardı ama kolon yoksa
        return null;
      }
      const sql = `UPDATE users SET ${finalSets.join(", ")} WHERE id = ?`;
      await pool.query(sql, [...finalVals, id]);
      const [rows2] = await pool.query(
        "SELECT id, username, email, role, COALESCE(is_active,1) AS is_active, create_at FROM users WHERE id = ? LIMIT 1",
        [id]
      );
      return rows2[0] || null;
    };

    try {
      const item = await run(false);
      if (!item)
        return res.json({
          item: { id, username, email, role: "admin", is_active: 1 },
        });
      return res.json({ item });
    } catch (e) {
      // ER_BAD_FIELD_ERROR: is_active kolonu yoksa
      if (e && e.code === "ER_BAD_FIELD_ERROR") {
        const item = await run(true);
        if (item) return res.json({ item });
      }
      throw e;
    }
  })
);

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
    return res.status(e && e.code === "ER_DUP_ENTRY" ? 409 : 500).json({
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

// ADMIN
app.get(
  "/api/admin/courses",
  requireAuth,
  ensureAdmin,
  wrap(async (req, res) => {
    const [rows] = await pool.query(
      "SELECT id, title, detail, video_url, created_at FROM courses ORDER BY id DESC"
    );
    return res.json({ list: rows });
  })
);

// POST /api/admin/courses
app.post(
  "/api/admin/courses",
  requireAuth,
  ensureAdmin,
  uploadForVid.single("video"),
  wrap(async (req, res) => {
    const title = String(req.body?.title || "").trim();
    const detail = String(req.body?.detail || "").trim() || null;

    if (!title) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: "Başlık zorunlu" });
    }
    if (!req.file)
      return res.status(400).json({ error: "Video dosyası zorunlu" });

    const requiredExt = ALLOWED_VIDEO.get(req.file.mimetype);
    if (
      requiredExt &&
      path.extname(req.file.filename).toLowerCase() !== requiredExt
    ) {
      const fixed = req.file.filename.replace(/\.[^.]+$/, requiredExt);
      const fixedAbs = path.join(COURSES_VIDEO_DIR, fixed);
      fs.renameSync(req.file.path, fixedAbs);
      req.file.filename = fixed;
      req.file.path = fixedAbs;
    }

    const relUrl = `/courses/video/${req.file.filename}`;
    try {
      const [r] = await pool.query(
        "INSERT INTO courses (title, detail, video_url) VALUES (?, ?, ?)",
        [title, detail, relUrl]
      );
      const [rows] = await pool.query(
        "SELECT id, title, detail, video_url, created_at FROM courses WHERE id = ?",
        [r.insertId]
      );
      return res.status(201).json({ item: rows[0] });
    } catch (e) {
      fs.unlink(req.file.path, () => {});
      throw e;
    }
  })
);

// DELETE /api/admin/courses/:id
app.delete(
  "/api/admin/courses/:id",
  requireAuth,
  ensureAdmin,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ error: "Geçersiz id" });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.query(
        "SELECT video_url FROM courses WHERE id = ? FOR UPDATE",
        [id]
      );
      const item = rows[0];
      await conn.query("DELETE FROM courses WHERE id = ?", [id]);

      await conn.commit();

      if (item?.video_url && item.video_url.startsWith("/courses/")) {
        const abs = safeJoin(COURSES_ROOT, item.video_url);
        fs.unlink(abs, () => {});
      }

      return res.json({ ok: true });
    } catch (e) {
      try {
        await conn.rollback();
      } catch {}
      throw e;
    } finally {
      try {
        conn.release();
      } catch {}
    }
  })
);

app.get("/api/courses", requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, title, detail, video_url, created_at FROM courses ORDER BY id DESC"
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "courses_list_fail" });
  }
});

app.get("/api/courses/:id", requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, title, detail, video_url, created_at FROM courses WHERE id=? LIMIT 1",
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "not_found" });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "course_detail_fail" });
  }
});

// --- GET /api/courses/:id/play  => { playback }
app.get("/api/courses/:id/play", requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT video_url FROM courses WHERE id=? LIMIT 1",
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "not_found" });
    const videoUrl = rows[0].video_url;

    // DB’de /courses/video/... olarak tutuluyor
    const playback = videoUrl.startsWith("http") ? videoUrl : `${videoUrl}`;

    res.json({ playback });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "course_play_fail" });
  }
});

app.get(
  "/api/courses/:id/manifest.m3u8",
  requireAuth,
  verifyPlayToken,
  (req, res) => {
    const manifestFile = path.join(
      COURSES_DIR,
      String(req.params.id),
      "manifest.m3u8"
    );
    res.sendFile(manifestFile);
  }
);

app.get("/api/courses/:id/:seg", requireAuth, verifyPlayToken, (req, res) => {
  const segFile = path.join(COURSES_DIR, String(req.params.id), req.params.seg);
  res.sendFile(segFile);
});

// server.js içinde uygun bir yere ekle
app.get("/api/admin/gallery", requireAuth, async (req, res) => {
  try {
    const files = fs.readdirSync(UPLOAD_DIR);
    const images = files
      .filter((f) => /\.(jpe?g|png|gif|webp)$/i.test(f))
      .map((f) => ({
        name: f,
        url: `${req.protocol}://${req.get("host")}/uploads/${f}`,
      }));

    res.json({ images });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Fotoğraf sil
app.delete("/api/admin/gallery/:name", requireAuth, (req, res) => {
  try {
    const name = req.params.name;
    const filePath = path.join(UPLOAD_DIR, name);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Dosya bulunamadı" });
    }

    fs.unlinkSync(filePath);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
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

app.use((req, _res, next) => {
  if (!req.user || !req.user.id) return next();
  // Eğer email/role yoksa sadece o alanları doldur
  if (
    req.user.email &&
    (req.user.role || typeof req.user.is_admin !== "undefined")
  )
    return next();
  pool
    .query("SELECT email, role, is_admin FROM users WHERE id = ? LIMIT 1", [
      req.user.id,
    ])
    .then(([rows]) => {
      if (rows && rows[0]) {
        req.user.email = req.user.email || rows[0].email;
        if (typeof req.user.is_admin === "undefined")
          req.user.is_admin = rows[0].is_admin;
        if (!req.user.role && rows[0].role) req.user.role = rows[0].role;
      }
      next();
    })
    .catch(() => next()); // sessiz geç: admin kontrolü zaten env ile de çalışır
});

app.get("/api/admin/_debug/whoami", (req, res) => {
  res.json({
    hasUser: !!(req.user && req.user.id),
    user: req.user || null,
    cookies: Object.keys(req.cookies || {}),
  });
});

app.use((req, _res, next) => {
  if (!req.user || !req.user.id) return next();
  if (
    req.user.email &&
    (req.user.role || typeof req.user.is_admin !== "undefined")
  )
    return next();
  pool
    .query("SELECT email, role, is_admin FROM users WHERE id = ? LIMIT 1", [
      req.user.id,
    ])
    .then(([rows]) => {
      if (rows && rows[0]) {
        req.user.email = req.user.email || rows[0].email;
        if (typeof req.user.is_admin === "undefined")
          req.user.is_admin = rows[0].is_admin;
        if (!req.user.role && rows[0].role) req.user.role = rows[0].role;
      }
      next();
    })
    .catch(() => next());
});

// 404
app.use((_req, res) => res.status(404).json({ error: "Not Found" }));

// start
app.listen(Number(PORT), () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
