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
require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });
const multer = require("multer");
const { customAlphabet } = require("nanoid");
const mime = require("mime-types");

const REQ = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASS", "DB_NAME"];
for (const k of REQ) {
  if (!process.env[k] || String(process.env[k]).trim() === "") {
    throw new Error(`Missing required env: ${k}`);
  }
}


const PLAYBACK_SECRET = process.env.PLAYBACK_SECRET || "dev-playback-secret";
const PLAYBACK_TTL = Number(process.env.PLAYBACK_TTL || 90); // saniye
const VIDEO_ROOT = process.env.VIDEO_ROOT || path.join(__dirname, "uploads", "courses");

// (Opsiyonel) tek kullanımlık jti takibi (memory). Prod: DB kullan.
const usedJtis = new Set();

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

const COURSES_DIR = path.join(__dirname, "courses", "video");
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";


// ! BLOB

// helper: make token (payload contains cid course id, jti)
function makePlaybackToken({ userId, courseId }) {
  const jti = Math.random().toString(36).slice(2);
  const payload = { sub: String(userId), cid: String(courseId), jti };
  return {
    token: jwt.sign(payload, PLAYBACK_SECRET, { expiresIn: `${PLAYBACK_TTL}s` }),
    jti,
    expiresIn: PLAYBACK_TTL,
  };
}

function verifyPlaybackToken(token) {
  try {
    return jwt.verify(token, PLAYBACK_SECRET);
  } catch (e) {
    return null;
  }
}

// async function getInternalVideoPath(courseId) {
//   const [rows] = await pool.query('SELECT internal_path, video_url FROM courses WHERE id=?', [courseId]);
//   if (!rows || !rows.length) return null;
//   const row = rows[0];
//   if (row.internal_path) return row.internal_path;
//   else if (row.video_url) return path.join(__dirname, 'public_videos', path.basename(row.video_url));
//   return null;

//   // === Basit fallback: eğer courses.video_url zaten server-relative dosya ise aynısını kullan:
//   // (Kendi DB sorgunu buraya yerleştir)
//   // throw new Error("getInternalVideoPath not implemented — implement DB lookup for courseId");
// }

async function getInternalVideoPath(courseId) {
  const [rows] = await pool.query(
    "SELECT video_url FROM courses WHERE id = ? LIMIT 1",
    [courseId]
  );
  if (!rows || rows.length === 0) return null;

  const url = rows[0].video_url || "";
  // url HTTP ile başlıyorsa: (ör. CDN) -> burada doğrudan stream etmek istemiyorsan
  // bu durumda dosyanın gerçek adı/url map’ini DB’de tutmalısın.
  if (/^https?:\/\//i.test(url)) {
    // Örn: DB’ye internal_name eklediğinde:
    // const [r2] = await pool.query("SELECT internal_name FROM courses WHERE id=?", [courseId]);
    // return path.join(VIDEO_ROOT, r2[0].internal_name);
    return null; // Şimdilik engelle
  }

  // '/courses/1761495...mp4' gibi bir şeyse:
  const fileName = path.basename(url);
  const full = path.join(VIDEO_ROOT, fileName);
  return full;
}

async function checkUserCanViewCourse(userId, courseId) {
  if (!userId) return false;

  // admin mi?
  const [u] = await pool.query(
    "SELECT role, is_admin FROM users WHERE id = ? LIMIT 1",
    [userId]
  );
  if (u.length && (u[0].role === "admin" || u[0].is_admin === 1)) return true;

  // Satın alma / üyelik tablosu (adını kendine göre değiştir)
  // Örn bir tablo: course_enrollments(user_id INT, course_id INT, active TINYINT)
  try {
    const [en] = await pool.query(
      "SELECT 1 FROM course_enrollments WHERE user_id=? AND course_id=? AND (active=1 OR active IS NULL) LIMIT 1",
      [userId, courseId]
    );
    if (en.length) return true;
  } catch (e) {
    // Eğer tablo yoksa kullanıcıya açık kurslar olabilir; şimdilik false yerine true yapabilirsin.
    // return true;
  }
  return false;
}


// BLOB

// function requireAuth(req, res, next) {
//   if (req.user && req.user.id) return next();

//   const bearer = req.headers.authorization?.startsWith("Bearer ")
//     ? req.headers.authorization.slice(7)
//     : null;
//   const cookieAccess =
//     req.cookies?.access ||
//     req.cookies?.access_token ||
//     req.cookies?.token ||
//     null;

//   let token = bearer || cookieAccess;

//   if (!token && req.cookies?.refresh) {
//     try {
//       const r = verifyRefresh(req.cookies.refresh); // JWT_REFRESH_SECRET
//       const fresh = signAccess({ sub: r.sub }); // JWT_ACCESS_SECRET
//       res.cookie("access", fresh, {
//         httpOnly: true,
//         sameSite: "lax",
//         secure: false,
//         maxAge: ms(process.env.ACCESS_TTL || "10m"),
//       });
//       token = fresh;
//     } catch {
//       return res.status(401).json({ error: "Unauthorized" });
//     }
//   }

//   if (!token) return res.status(401).json({ error: "Unauthorized" });

//   try {
//     const p = verifyAccess(token); // *** sadece JWT_ACCESS_SECRET ***
//     req.user = {
//       id: p.sub,
//       email: p.email,
//       role: p.role,
//       is_admin: p.is_admin,
//     };
//     next();
//   } catch {
//     return res.status(401).json({ error: "Unauthorized" });
//   }
// }

// === only customers ===
function requireUserAuth(req, res, next) {
  if (req.user?.id) return next();

  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  const cookieAccess = req.cookies?.u_access || null;

  let token = bearer || cookieAccess;

  // access yoksa user refresh ile yenile
  if (!token && req.cookies?.u_refresh) {
    try {
      const r = verifyRefresh(req.cookies.u_refresh);
      if (r?.aud && r.aud !== "user") throw new Error("aud mismatch");
      const fresh = signAccess({ sub: r.sub, aud: "user" });
      res.cookie("u_access", fresh, {
        httpOnly: true, sameSite: "lax", secure: false,
        maxAge: ms(process.env.ACCESS_TTL || ACCESS_TTL), path: "/",
      });
      token = fresh;
    } catch {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const p = verifyAccess(token);
    if (p?.aud && p.aud !== "user") return res.status(401).json({ error: "Unauthorized" });
    req.user = { id: p.sub, email: p.email || null, role: p.role || "user" };
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

function requireAuth(req, res, next) {
  if (req.user && req.user.id) return next();

  const bearer = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;

  const cookieAccess =
    req.cookies?.access ||
    req.cookies?.access_token ||
    req.cookies?.token ||
    null;

  let token = bearer || cookieAccess;

  // access yoksa refresh ile yeni access üret
  if (!token && req.cookies?.refresh) {
    try {
      const r = verifyRefresh(req.cookies.refresh);      // JWT_REFRESH_SECRET
      const fresh = signAccess({ sub: r.sub });          // JWT_ACCESS_SECRET
      res.cookie("access", fresh, {
        httpOnly: true, sameSite: "lax", secure: false,
        maxAge: ms(process.env.ACCESS_TTL || ACCESS_TTL)
      });
      token = fresh;
    } catch {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const p = verifyAccess(token);
    req.user = {
      id: p.sub,
      email: p.email || null,
      role: p.role || "user",
    };
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}


// Token üretimi (requireAuth ile aynı secret'ı kullanıyoruz)
function signUserToken(payload) {
  return jwt.sign(
    { ...payload, aud: "user", scope: "user" },
    JWT_ACCESS_SECRET,
    {
      expiresIn: ACCESS_TTL,
    }
  );
}

// req.user içindeki id alanı adı değişken olabilir; ikisini de dene
function getAuthUserId(req) {
  return req?.user?.sub ?? req?.user?.id ?? null;
}

// Telefon ülke kodunu çıkar
function splitDialAndNumber(full) {
  if (!full) return { dial: null, num: null };
  const s = String(full).replace(/\s+/g, "");
  if (s[0] !== "+") return { dial: null, num: s };
  for (let len = 4; len >= 1; len--) {
    const dial = s.slice(0, 1 + len).replace(/[^\+\d]/g, "");
    const rest = s.slice(1 + len);
    if (/^\+\d{1,4}$/.test(dial)) return { dial, num: rest };
  }
  return { dial: null, num: s.replace(/^\+/, "") };
}

const app = express();

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:1001";

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ! ERROR: Express 5 + path-to-regexp v6
// app.options("/.*/", cors({ origin: FRONTEND_ORIGIN, credentials: true }));

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

// --- app ---
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

// app.use(
//   cors({
//     origin: (origin, cb) => {
//       if (!origin || [...allowlist].some((o) => o === origin)) cb(null, true);
//       else cb(null, false);
//     },
//     credentials: true,
//   })
// );

// !
// === Static root for courses (video) ===
const COURSES_ROOT = path.join(__dirname, "courses");
const COURSES_VIDEO_DIR = path.join(COURSES_ROOT, "video");

fs.mkdirSync(COURSES_VIDEO_DIR, { recursive: true });

// Videolar için statik servis (Range destekli). Örn: /courses/video/xxx.mp4
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

// === helpers ===
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

// Yalnızca belirli video tiplerine izin ver
const ALLOWED_VIDEO = new Map([
  ["video/mp4", ".mp4"],
  ["video/webm", ".webm"],
  ["video/quicktime", ".mov"],
  ["video/x-matroska", ".mkv"],
]);

const MAX_VIDEO_MB = Number(process.env.MAX_VIDEO_MB || 1024); // 1 GB varsayılan

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

// küçük async wrapper
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// --- Admin helper'ları ---
function isTruthy(v) {
  return v === true || v === 1 || v === "1" || v === "true";
}

function getIsAdmin(req) {
  const u = req.user || {};
  const byRole =
    (u.role &&
      (String(u.role).toLowerCase() === "admin" ||
        String(u.role).toLowerCase() === "editor")) ||
    isTruthy(u.is_admin);

  // .env allowlist
  const envList = String(process.env.ADMIN_EMAILS || "hattab1342@gmail.com")
    .toLowerCase()
    .split(/[,\s]+/)
    .filter(Boolean);
  const byEmail = u.email && envList.includes(String(u.email).toLowerCase());

  // bazı projelerde oturumda rol tutuluyor
  const bySession =
    (req.session &&
      (req.session.isAdmin === true ||
        req.session.role === "admin" ||
        req.session.role === "editor")) ||
    false;

  return Boolean(byRole || byEmail || bySession);
}

function ensureAdmin(req, res, next) {
  if (req.user && req.user.id) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

// !

function scanCoursesFS() {
  if (!fs.existsSync(COURSES_DIR)) return [];
  return fs
    .readdirSync(COURSES_DIR)
    .filter((name) =>
      fs.existsSync(path.join(COURSES_DIR, name, "manifest.m3u8"))
    )
    .map((name, i) => ({
      id: Number(name) || i + 1,
      title: name,
      detail: null,
      created_at: new Date().toISOString(),
    }));
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
      [emailOrUsername, emailOrUsername, password]
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

// ! USER LOGIN & REGISTER & ME
// app.post("/api/auth/user-login", async (req, res) => {
//   try {
//     const idf =
//       req.body?.emailOrUsername || req.body?.email || req.body?.username; // EKLENDİ: username fallback
//     const { password } = req.body || {};

//     if (!idf || !password) {
//       return res.status(400).json({ error: "Eksik alan" });
//     }

//     const [rows] = await pool.query(
//       `SELECT id, username, email, password, phone, country_dial, membership_notify
//          FROM customers
//         WHERE email = ? OR username = ?
//         LIMIT 1`,
//       [idf, idf]
//     );
//     if (!rows.length) {
//       return res.status(401).json({ error: "Geçersiz kimlik" });
//     }

//     const u = rows[0];
//     const ok = isBcrypt(u.password)
//       ? bcrypt.compareSync(password, u.password)
//       : password === u.password;

//     if (!ok) return res.status(401).json({ error: "Geçersiz kimlik" });

//     // Plain ise sessiz migrasyon
//     if (!isBcrypt(u.password)) {
//       const hash = bcrypt.hashSync(u.password, 10);
//       await pool.query("UPDATE customers SET password=? WHERE id=?", [
//         hash,
//         u.id,
//       ]);
//     }

//     // refresh cookie (senin kodunla uyumlu)
//     const token = signUserToken({ sub: u.id, username: u.username });
//     res.cookie("refresh", token, {
//       httpOnly: true,
//       sameSite: "lax",
//       secure: false,
//       maxAge: ms(REFRESH_TTL),
//     });

//     res.json({
//       token,
//       user: {
//         id: u.id,
//         email: u.email,
//         username: u.username,
//         phone: u.phone || null,
//         countryDial: u.country_dial || null,
//         membershipNotify: !!u.membership_notify,
//       },
//     });
//   } catch (e) {
//     console.error("user-login error:", e);
//     res.status(500).json({ error: "Sunucu hatası" });
//   }
// });

// === CUSTOMERS LOGIN (user) ===
app.post("/api/auth/user-login", async (req, res) => {
  try {
    const idf = req.body?.emailOrUsername || req.body?.email || req.body?.username;
    const { password } = req.body || {};
    if (!idf || !password) return res.status(400).json({ error: "Eksik alan" });

    const [rows] = await pool.query(
      `SELECT id, username, email, password, phone, country_dial, membership_notify
         FROM customers
        WHERE email = ? OR username = ?
        LIMIT 1`,
      [idf, idf]
    );
    if (!rows.length) return res.status(401).json({ error: "Geçersiz kimlik" });

    const u = rows[0];
    const ok = isBcrypt(u.password)
      ? await bcrypt.compare(password, u.password)
      : password === u.password;
    if (!ok) return res.status(401).json({ error: "Geçersiz kimlik" });

    // plain ise sessiz migrasyon
    if (!isBcrypt(u.password)) {
      const hash = await bcrypt.hash(u.password, 10);
      await pool.query("UPDATE customers SET password=? WHERE id=?", [hash, u.id]);
    }

    // >>> user'a özel access/refresh + aud: 'user'
    const access = signAccess({ sub: u.id, email: u.email, role: "user", aud: "user" });
    const refresh = signRefresh({ sub: u.id, aud: "user" });

    res.cookie("u_access", access, {
      httpOnly: true, sameSite: "lax", secure: false,
      maxAge: ms(ACCESS_TTL), path: "/",
    });
    res.cookie("u_refresh", refresh, {
      httpOnly: true, sameSite: "lax", secure: false,
      maxAge: ms(REFRESH_TTL), path: "/",
    });

    // Frontend uyumluluğu için JSON’a da koyuyorum
    return res.json({
      access,
      token: access,
      user: {
        id: u.id,
        email: u.email,
        username: u.username,
        phone: u.phone || null,
        countryDial: u.country_dial || null,
        membershipNotify: !!u.membership_notify,
      },
    });
  } catch (e) {
    console.error("user-login error:", e);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// app.post("/api/auth/user-register", registerHandler);

// async function registerHandler(req, res) {
//   try {
//     const {
//       email,
//       username,
//       password,
//       fname = null,
//       sname = null,
//       phone: rawPhone = null, // E.164 bekliyoruz (+90...)
//       countryDial = null, // "+90"
//     } = req.body || {};

//     if (!email || !username || !password) {
//       return res.status(400).json({ error: "Eksik alan" });
//     }

//     // benzersiz mi?
//     const [dup] = await pool.execute(
//       "SELECT id FROM customers WHERE email = ? OR username = ? LIMIT 1",
//       [email, username]
//     );
//     if (dup.length) {
//       return res.status(409).json({ error: "Kullanıcı zaten var" });
//     }

//     // phone temizliği (E.164 onayı; + ve rakamlar)
//     let phone = rawPhone;
//     if (phone) {
//       const cleaned = String(phone).replace(/[^\d+]/g, "");
//       if (!/^\+\d{5,15}$/.test(cleaned)) {
//         return res.status(400).json({ error: "Geçersiz telefon" });
//       }
//       phone = cleaned;
//     }

//     const hashed = await bcrypt.hash(password, 10);

//     const [ins] = await pool.execute(
//       `INSERT INTO customers
//         (username, email, password, fname, sname, full_name, phone, country_dial, created_at, updated_at)
//        VALUES (?, ?, ?, ?, ?, CONCAT(COALESCE(?,''),' ',COALESCE(?,'')), ?, ?, NOW(), NOW())`,
//       [username, email, hashed, fname, sname, fname, sname, phone, countryDial]
//     );

//     const userId = ins.insertId;

//     // Kayıt sonrası otomatik login (access + refresh)
//     const access = signAccess({
//       sub: userId,
//       email,
//       role: "user",
//       is_admin: 0,
//     });
//     const refresh = signRefresh({ sub: userId });

//     res.cookie("access", access, {
//       httpOnly: true,
//       sameSite: "lax",
//       secure: false,
//       maxAge: ms(ACCESS_TTL),
//     });
//     res.cookie("refresh", refresh, {
//       httpOnly: true,
//       sameSite: "lax",
//       secure: false,
//       maxAge: ms(REFRESH_TTL),
//     });

//     return res.status(201).json({ ok: true, id: userId });
//   } catch (e) {
//     console.error("register error", e);
//     return res.status(500).json({ error: "Sunucu hatası" });
//   }
// }

app.post("/api/auth/user-register", async (req, res) => {
  const { fname, sname, username, email, password, phone, country_dial } = req.body;
  if (!fname || !sname || !username || !email || !password)
    return res.status(400).json({ error: "Eksik bilgi" });

  const [exists] = await pool.query(
    "SELECT id FROM customers WHERE username=? OR email=? LIMIT 1",
    [username, email]
  );
  if (exists.length) return res.status(409).json({ error: "Kullanıcı zaten var" });

  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    "INSERT INTO customers (fname, sname, full_name, username, email, password, phone, country_dial) VALUES (?,?,?,?,?,?,?,?)",
    [fname, sname, `${fname} ${sname}`, username, email, hash, phone || null, country_dial || null]
  );
  res.json({ ok: true });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    let { email, username, password, phone } = req.body || {};
    email = String(email || "")
      .trim()
      .toLowerCase();
    username = String(username || "").trim();
    password = String(password || "");

    if (!email || !username || password.length < 6) {
      return res.status(400).json({ error: "Eksik veya hatalı alan" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "E-posta geçersiz" });
    }

    const [dupe] = await pool.query(
      "SELECT id FROM customers WHERE email=? OR username=? LIMIT 1",
      [email, username]
    );
    if (dupe.length) {
      return res
        .status(409)
        .json({ error: "E-posta veya kullanıcı adı kullanılıyor" });
    }

    const hash = bcrypt.hashSync(password, 10);
    const { dial } = splitDialAndNumber(phone);

    const [ins] = await pool.query(
      "INSERT INTO customers (username, email, password, phone, country_dial) VALUES (?,?,?,?,?)",
      [username, email, hash, phone || null, dial || null]
    );

    const token = signUserToken({ sub: ins.insertId, username });
    // İstersen refresh cookie; requireAuth sadece Bearer kullanıyorsa şart değil
    res.cookie("refresh", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: ms(REFRESH_TTL),
    });

    res.status(201).json({
      token,
      user: { id: ins.insertId, email, username, phone: phone || null },
    });
  } catch (e) {
    console.error("register error:", e);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// app.get("/api/account/user-me", requireAuth, async (req, res) => {
//   try {
//     const uid = getAuthUserId(req);
//     if (!uid) return res.status(401).json({ error: "Kimlik gerekli" });

//     const [rows] = await pool.execute(
//       `SELECT id, email, username, phone, country_dial, membership_notify
//          FROM customers WHERE id = ? LIMIT 1`,
//       [uid]
//     );
//     if (!rows.length) return res.status(404).json({ error: "Kullanıcı bulunamadı" });

//     const u = rows[0];
//     res.json({
//       id: u.id,
//       email: u.email,
//       username: u.username,
//       phone: u.phone,
//       countryDial: u.country_dial,
//       membershipNotify: !!u.membership_notify,
//     });
//   } catch (e) {
//     console.error("user-me error:", e);
//     res.status(500).json({ error: "Sunucu hatası" });
//   }
// });


// app.get("/api/account/user-me", requireUserAuth, async (req, res) => {
//   const uid = getAuthUserId(req);
//   if (!uid) return res.status(401).json({ error: "Kimlik gerekli" });

//   const [rows] = await pool.execute(
//     `SELECT id, email, username, phone, country_dial, membership_notify
//        FROM customers WHERE id = ? LIMIT 1`,
//     [uid]
//   );
//   if (!rows.length) return res.status(404).json({ error: "Kullanıcı bulunamadı" });

//   const u = rows[0];
//   res.json({
//     id: u.id,
//     email: u.email,
//     username: u.username,
//     phone: u.phone,
//     countryDial: u.country_dial,
//     membershipNotify: !!u.membership_notify,
//   });
// });

app.get("/api/account/user-me", requireUserAuth /* veya requireAuth */, async (req, res) => {
  try {
    const uid = getAuthUserId(req);
    if (!uid) return res.status(401).json({ error: "Kimlik gerekli" });

    const [rows] = await pool.execute(
      `SELECT id, email, username, phone, country_dial, membership_notify, theme
         FROM customers WHERE id = ? LIMIT 1`,
      [uid]
    );
    if (!rows.length) return res.status(404).json({ error: "Kullanıcı bulunamadı" });

    const u = rows[0];
    res.json({
      id: u.id,
      email: u.email,
      username: u.username,
      phone: u.phone,
      countryDial: u.country_dial,
      membershipNotify: !!u.membership_notify,
      theme: Number(u.theme) === 1 ? "light" : "dark",
    });
  } catch (e) {
    console.error("user-me error:", e);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});


// Hesap: Güncelle (şimdilik sadece telefon)
// app.patch("/api/account/user-update", requireUserAuth, async (req, res) => {
//   try {
//     const uid = getAuthUserId(req);
//     if (!uid) return res.status(401).json({ error: "Kimlik gerekli" });

//     const phone =
//       typeof req.body?.phone === "string" ? req.body.phone.trim() : null;
//     const membershipNotify =
//       typeof req.body?.membershipNotify === "boolean"
//         ? req.body.membershipNotify
//         : null;

//     const fields = [];
//     const values = [];

//     if (phone !== null) {
//       const { dial } = splitDialAndNumber(phone);
//       fields.push("phone = ?", "country_dial = ?");
//       values.push(phone || null, dial || null);
//     }
//     if (membershipNotify !== null) {
//       fields.push("membership_notify = ?");
//       values.push(membershipNotify ? 1 : 0);
//     }

//     if (!fields.length)
//       return res.status(400).json({ error: "Güncellenecek alan yok" });

//     values.push(uid);
//     const sql = `UPDATE customers SET ${fields.join(", ")} WHERE id=?`;
//     await pool.query(sql, values);

//     res.json({ ok: true });
//   } catch (e) {
//     console.error("user-update error:", e);
//     res.status(500).json({ error: "Sunucu hatası" });
//   }
// });

app.patch("/api/account/user-update", requireUserAuth /* veya requireAuth */, async (req, res) => {
  try {
    const uid = getAuthUserId(req);
    if (!uid) return res.status(401).json({ error: "Kimlik gerekli" });

    // const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : undefined;
    // const membershipNotify = typeof req.body?.membershipNotify === "boolean" ? req.body.membershipNotify : undefined;

    const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : undefined;
    const membershipNotify = typeof req.body?.membershipNotify === "boolean" ? req.body.membershipNotify : undefined;
    // theme: 'light' | 'dark' | 1 | 0 kabul
    let theme = req.body?.theme;
    if (typeof theme !== "undefined") {
      if (theme === "light" || theme === 1 || theme === "1") theme = 1;
      else if (theme === "dark" || theme === 0 || theme === "0") theme = 0;
      else return res.status(400).json({ error: "Geçersiz tema" });
    }

    // 'light' | 'dark' | 1 | 0 destekleyelim:
    // let theme = req.body?.theme;
    // if (typeof theme !== "undefined") {
    //   if (theme === "light" || theme === 1 || theme === "1") theme = 1;
    //   else if (theme === "dark" || theme === 0 || theme === "0") theme = 0;
    //   else return res.status(400).json({ error: "Geçersiz tema" });
    // }

    const fields = [];
    const values = [];

    if (typeof phone !== "undefined") {
      fields.push("phone = ?");
      values.push(phone || null);
    }
    if (typeof membershipNotify !== "undefined") {
      fields.push("membership_notify = ?");
      values.push(membershipNotify ? 1 : 0);
    }
    if (typeof theme !== "undefined") {
      fields.push("theme = ?");
      values.push(theme);
    }

    if (!fields.length) return res.status(400).json({ error: "Güncellenecek alan yok" });

    values.push(uid);
    const sql = `UPDATE customers SET ${fields.join(", ")} WHERE id=?`;
    await pool.query(sql, values);

    res.json({ ok: true });
  } catch (e) {
    console.error("user-update error:", e);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});


// Hesap: Şifre değiştir
app.post("/api/account/user-change-password", requireUserAuth, async (req, res) => {
  try {
    const uid = getAuthUserId(req);
    if (!uid) return res.status(401).json({ error: "Kimlik gerekli" });

    const { current_password, new_password } = req.body || {};
    if (!current_password || !new_password || String(new_password).length < 6) {
      return res.status(400).json({ error: "Geçersiz şifre" });
    }

    const [rows] = await pool.query(
      "SELECT password FROM customers WHERE id=? LIMIT 1",
      [uid]
    );
    if (!rows.length)
      return res.status(404).json({ error: "Kullanıcı bulunamadı" });

    const ok = isBcrypt(rows[0].password)
      ? bcrypt.compareSync(current_password, rows[0].password)
      : current_password === rows[0].password;

    if (!ok) return res.status(401).json({ error: "Mevcut şifre yanlış" });

    const hash = bcrypt.hashSync(String(new_password), 10);
    await pool.query("UPDATE customers SET password=? WHERE id=?", [hash, uid]);

    res.json({ ok: true });
  } catch (e) {
    console.error("user-change-password error:", e);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.post(
  "/api/account/user-notify-membership",
  requireUserAuth,
  async (req, res) => {
    try {
      const uid = getAuthUserId(req);
      if (!uid) return res.status(401).json({ error: "Kimlik gerekli" });

      const notify = !!req.body?.notify;
      await pool.query("UPDATE customers SET membership_notify=? WHERE id=?", [
        notify ? 1 : 0,
        uid,
      ]);

      res.json({ ok: true, notify });
    } catch (e) {
      console.error("user-notify-membership error:", e);
      res.status(500).json({ error: "Sunucu hatası" });
    }
  }
);

// app.delete("/api/account/user-delete", requireAuth, async (req, res) => {
//   try {
//     const uid = getAuthUserId(req);
//     if (!uid) return res.status(401).json({ error: "Kimlik gerekli" });

//     await pool.query("DELETE FROM customers WHERE id=?", [uid]);
//     res.clearCookie("refresh");
//     res.json({ ok: true });
//   } catch (e) {
//     console.error("user-delete error:", e);
//     res.status(500).json({ error: "Sunucu hatası" });
//   }
// });

// ! REFRESH & LOGOUT & ME

// app.post("/api/auth/refresh", async (req, res) => {
//   try {
//     const token = req.cookies?.refresh;
//     if (!token) return res.status(401).json({ error: "Yenileme yok" });
//     const payload = verifyRefresh(token);
//     const access = signAccess({ sub: payload.sub });
//     res.json({ access });
//   } catch {
//     return res.status(401).json({ error: "Geçersiz yenileme" });
//   }
// });

app.delete("/api/account/user-delete", requireUserAuth, async (req, res) => {
  try {
    const uid = getAuthUserId(req);
    if (!uid) return res.status(401).json({ error: "Kimlik gerekli" });

    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: "Şifre gerekli" });

    const [[row]] = await pool.query("SELECT password FROM customers WHERE id=?", [uid]);
    if (!row) return res.status(404).json({ error: "Kullanıcı bulunamadı" });

    const ok = isBcrypt(row.password)
      ? await bcrypt.compare(password, row.password)
      : password === row.password;

    if (!ok) return res.status(400).json({ error: "Şifre yanlış" });

    await pool.query("DELETE FROM customers WHERE id=?", [uid]);
    res.clearCookie("access");
    res.clearCookie("refresh");
    res.json({ ok: true });
  } catch (e) {
    console.error("user-delete error:", e);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});


app.post("/api/auth/refresh", async (req, res) => {
  try {
    const r = req.cookies?.refresh;
    if (!r) return res.status(401).json({ error: "Unauthorized" });

    const p = verifyRefresh(r);              // REFRESH secret
    const access = signAccess({ sub: p.sub });// ACCESS secret

    res.cookie("access", access, {
      httpOnly: true, sameSite: "lax", secure: false, maxAge: ms(ACCESS_TTL),
    });

    return res.json({ access });
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" });
  }
});


// === CUSTOMERS REFRESH (user) ===
// /api/auth/user-refresh
app.post("/api/auth/user-refresh", (req, res) => {
  try {
    const r = req.cookies?.u_refresh || req.cookies?.refresh; // ikisini de kabul edebilirsin
    if (!r) return res.status(401).json({ error: "Unauthorized" });
    const p = verifyRefresh(r);
    const access = signAccess({ sub: p.sub, role: "user" }); // aud: 'user' da ekleyebilirsin
    res.cookie("u_access", access, {
      httpOnly: true, sameSite: "lax", secure: false, maxAge: ms(ACCESS_TTL),
    });
    res.json({ access });
  } catch {
    res.status(401).json({ error: "Unauthorized" });
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

// GET /api/admin/courses
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
      if (req.file) fs.unlink(req.file.path, () => { });
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
      fs.unlink(req.file.path, () => { });
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
        fs.unlink(abs, () => { });
      }

      return res.json({ ok: true });
    } catch (e) {
      try {
        await conn.rollback();
      } catch { }
      throw e;
    } finally {
      try {
        conn.release();
      } catch { }
    }
  })
);

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

// --- GET /api/user-courses/:id
app.get("/api/courses/:id", requireUserAuth, async (req, res) => {
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

// app.get("/api/courses/:id/play", requireAuth, async (req, res) => {
//   try {
//     const [rows] = await pool.query(
//       "SELECT video_url FROM courses WHERE id=? LIMIT 1",
//       [req.params.id]
//     );
//     if (!rows[0]) return res.status(404).json({ error: "not_found" });
//     const videoUrl = rows[0].video_url;

//     // DB’de /courses/video/... olarak tutuluyor
//     const playback = videoUrl.startsWith("http") ? videoUrl : `${videoUrl}`;

//     res.json({ playback });
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ error: "course_play_fail" });
//   }
// });

// genel hata yakalayıcı
// app.use((err, req, res, next) => {
//   console.error("[ERR]", err && (err.stack || err.message || err));
//   if (res.headersSent) return next(err);
//   const status = (err && (Number(err.statusCode) || Number(err.status))) || 500;
//   res.status(status).json({ error: err.message || "Sunucu hatası" });
// });


app.get("/api/courses/:id/play", requireAuth, async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user.id;

    const allowed = await checkUserCanViewCourse(userId, courseId);
    if (!allowed) return res.status(403).json({ error: "forbidden" });

    const { token, jti } = makePlaybackToken({ userId, courseId });
    // Tek kullanımlık istersen:
    usedJtis.add(jti);
    setTimeout(() => usedJtis.delete(jti), (PLAYBACK_TTL + 5) * 1000);

    const playbackUrl = `/api/courses/${courseId}/stream?token=${encodeURIComponent(token)}`;
    return res.json({ playback: playbackUrl, expiresIn: PLAYBACK_TTL });
  } catch (err) {
    console.error("play error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

app.get("/api/courses/:id/stream", async (req, res) => {
  try {
    const token = req.query.token || req.headers["x-playback-token"];
    const data = token ? verifyPlaybackToken(token) : null;
    if (!data) return res.status(401).end();
    if (String(data.cid) !== String(req.params.id)) return res.status(403).end();
    if (data.jti && !usedJtis.has(data.jti)) return res.status(401).end(); // tek kullanımlık

    const filePath = await getInternalVideoPath(req.params.id);
    if (!filePath || !fs.existsSync(filePath)) return res.status(404).end();

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const [s, e] = range.replace(/bytes=/, "").split("-");
      const start = parseInt(s, 10);
      const end = e ? parseInt(e, 10) : fileSize - 1;
      if (start >= fileSize) {
        res.status(416).set("Content-Range", `bytes */${fileSize}`).end();
        return;
      }
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(end - start + 1),
        "Content-Type": "video/mp4",
        "Cache-Control": "private, max-age=0, no-transform",
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": String(fileSize),
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error("stream error", err);
    if (!res.headersSent) res.status(500).end();
  }
});

// requireAuth ardından gelen ortak middleware (opsiyonel, ama faydalı)
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

// Regular expression ile
app.get(/^\/courses\/video\//, (req, res) => {
  res.status(404).json({ error: "nonononon" });
});

// 404
app.use((_req, res) => res.status(404).json({ error: "Not Found" }));

// start
app.listen(Number(PORT), () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
