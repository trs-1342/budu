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

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:1001";
const COURSES_ROOT = path.join(__dirname, "courses");
const COURSES_VIDEO_DIR = path.join(COURSES_ROOT, "video");
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
  res.header("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  // Hls.js + Range için
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Range"
  );
  // Video oynatıcıların görebilmesi için expose
  res.header(
    "Access-Control-Expose-Headers",
    "Content-Length, Content-Range, Accept-Ranges"
  );
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

function s(v) {
  return typeof v === "string" ? v.trim() : "";
}

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

function isEmail(x) {
  return EMAIL_RE.test(String(x || "").toLowerCase());
}

// ! DELETE

function parseKey(emailOrUsername = "") {
  const key = String(emailOrUsername || "")
    .trim()
    .toLowerCase();
  if (EMAIL_RE.test(key)) return { col: "email", val: key };
  if (USER_RE.test(key)) return { col: "username", val: key };
  // e-posta değilse kullanıcı adı gibi davran
  return { col: "username", val: key };
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

function parseIdentifier(body) {
  const raw =
    s(body?.emailOrUsername) ||
    s(body?.identifier) ||
    s(body?.email) ||
    s(body?.username);
  if (!raw) return { kind: null, value: "" };
  const kind = raw.includes("@") ? "email" : "username";
  const value = kind === "email" ? raw.toLowerCase() : raw;
  return { kind, value };
}

// --- CUSTOMER JWT sadece Authorization header'dan gelir ---
function getCustomerToken(req) {
  const h = req.headers?.authorization || "";
  if (h.startsWith("Bearer ")) return h.slice(7).trim();
  return null;
}

function verifyCustomerToken(token) {
  const payload = verifyAccess(token); // sende mevcut
  if (payload?.role && payload.role !== "customer") {
    const e = new Error("ROLE_MISMATCH");
    e.code = "ROLE_MISMATCH";
    throw e;
  }
  return payload;
}

function requireCustomer(req, res, next) {
  const t = getCustomerToken(req);
  if (!t) return res.status(401).json({ error: "Yetkisiz" });
  try {
    req.customer = verifyCustomerToken(t);
    next();
  } catch (e) {
    return res
      .status(e?.code === "ROLE_MISMATCH" ? 403 : 401)
      .json({ error: "Yetkisiz" });
  }
}

// function parseKey(emailOrUsername = "") {
//   const key = String(emailOrUsername || "")
//     .trim()
//     .toLowerCase();
//   if (EMAIL_RE.test(key)) return { col: "email", val: key };
//   if (USER_RE.test(key)) return { col: "username", val: key };
//   // e-posta değilse kullanıcı adı gibi davran
//   return { col: "username", val: key };
// }

// function getCustomerToken(req) {
//   const h = req.headers?.authorization || "";
//   if (h.startsWith("Bearer ")) return h.slice(7).trim();
//   return null;
// }
// function verifyCustomerToken(token) {
//   const payload = verifyAccess(token); // mevcut imzalayıcın
//   if (payload?.role && payload.role !== "customer") {
//     const err = new Error("ROLE_MISMATCH");
//     err.code = "ROLE_MISMATCH";
//     throw err;
//   }
//   return payload;
// }
// function requireCustomer(req, res, next) {
//   const t = getCustomerToken(req);
//   if (!t) return res.status(401).json({ error: "Yetkisiz" });
//   try {
//     req.customer = verifyCustomerToken(t);
//     next();
//   } catch (e) {
//     return res
//       .status(e?.code === "ROLE_MISMATCH" ? 403 : 401)
//       .json({ error: "Yetkisiz" });
//   }
// }

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

function readAccessToken(req) {
  const h = req.headers?.authorization || "";
  if (h.startsWith("Bearer ")) return h.slice(7).trim();
  return req.cookies?.access || null;
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

app.post("/api/customers/login", async (req, res) => {
  try {
    const idf = parseIdentifier(req.body); // { kind: 'email' | 'username' | null, value: string }
    const password = s(req.body?.password);
    const remember = !!req.body?.remember;

    if (!idf.kind || !idf.value || !password) {
      return res.status(400).json({ error: "Eksik alan" });
    }

    const col = idf.kind === "email" ? "email" : "username";
    const [rows] = await pool.execute(
      `SELECT id, username, email, password, fname, sname, phone, country_dial
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
      : password === user.password; // (eski düz kayıt varsa geçici uyumluluk)

    if (!ok) return res.status(401).json({ error: "Geçersiz kimlik" });

    const payload = { sub: user.id, role: "customer" };
    const token = signAccess(payload, { remember }); // TTL vs. fonksiyonun destekliyorsa

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fname: user.fname ?? null,
        sname: user.sname ?? null,
        phone: user.phone ?? null,
        countryDial: user.country_dial ?? null,
        role: "user", // FE tipinde 'user'/'admin' alanı varsa
      },
    });
  } catch (err) {
    console.error("user-login error:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

// app.get("/api/customers/user-me", requireCustomer, async (req, res) => {
//   try {
//     const uid = req.customer.sub;
//     const [rows] = await pool.execute(
//       `SELECT id, username, email, fname, sname, country_dial AS countryDial, phone
//          FROM customers WHERE id = ? LIMIT 1`,
//       [uid]
//     );
//     if (!rows.length) return res.status(401).json({ error: "Yetkisiz" });
//     return res.json(rows[0]); // wrapper yok
//   } catch (err) {
//     console.error("customers user-me error:", err);
//     return res.status(500).json({ error: "Sunucu hatası" });
//   }
// });

app.get("/api/customers/user-me", requireCustomer, async (req, res) => {
  try {
    const uid = req.customer.sub;
    const [rows] = await pool.execute(
      `SELECT id, username, email, fname, sname, phone, country_dial AS countryDial
         FROM customers WHERE id = ? LIMIT 1`,
      [uid]
    );
    if (!rows.length) return res.status(401).json({ error: "Yetkisiz" });
    res.json(rows[0]);
  } catch (e) {
    console.error("user-me error:", e);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

app.patch("/api/customers/profile", requireCustomer, async (req, res) => {
  try {
    const uid = req.customer.sub;
    const token = readAccessToken(req);
    if (!token) return res.status(401).json({ error: "Yetkisiz" });

    let payload;
    try {
      payload = verifyAccess(token);
    } catch {
      return res.status(401).json({ error: "Yetkisiz" });
    }
    // const uid = payload.sub;

    // Mevcut kullanıcıyı al
    const [curRows] = await pool.query(
      "SELECT id, username, email, fname, sname, country_dial, phone FROM customers WHERE id = ? LIMIT 1",
      [uid]
    );
    if (!curRows.length) return res.status(401).json({ error: "Yetkisiz" });
    const current = curRows[0];

    // Gövde
    const { fname, sname, username, email, country_dial, phone, password } =
      req.body || {};

    const s = (v) => (typeof v === "string" ? v.trim() : "");
    const normDial = (d) => {
      if (!d) return "";
      const t = String(d).trim();
      return t.startsWith("+") ? t : `+${t.replace(/^\+/, "")}`;
    };

    const u = username !== undefined ? s(username).toLowerCase() : undefined;
    const e = email !== undefined ? s(email).toLowerCase() : undefined;
    const cd = country_dial !== undefined ? normDial(country_dial) : undefined;
    const ph = phone !== undefined ? s(phone).replace(/\D/g, "") : undefined;

    // Validasyon (yalnız gönderilen alanlar)
    if (u !== undefined && !USER_RE.test(u)) {
      return res.status(400).json({ error: "Geçersiz kullanıcı adı" });
    }
    if (e !== undefined && !EMAIL_RE.test(e)) {
      return res.status(400).json({ error: "Geçersiz e-posta" });
    }
    if (ph !== undefined) {
      if (ph && (ph.length < 6 || ph.length > 16)) {
        return res.status(400).json({ error: "Telefon 6–16 hane olmalı" });
      }
      if (ph && !cd) {
        return res.status(400).json({ error: "Ülke kodu gerekli" });
      }
    }
    if (password !== undefined) {
      const p = String(password);
      if (p.length && (p.length < 6 || p.length > 72)) {
        return res.status(400).json({ error: "Parola 6–72 karakter olmalı" });
      }
    }

    // Hangi alan gerçekten değişiyor?
    const wantUsername =
      u !== undefined && u !== String(current.username).toLowerCase();
    const wantEmail =
      e !== undefined && e !== String(current.email).toLowerCase();
    const wantFname = fname !== undefined && s(fname) !== (current.fname ?? "");
    const wantSname = sname !== undefined && s(sname) !== (current.sname ?? "");
    const wantPhone = phone !== undefined; // boş gönderme = sil
    const wantPass = password !== undefined && String(password).length > 0;

    // Hiç değişiklik yoksa
    if (
      !wantUsername &&
      !wantEmail &&
      !wantFname &&
      !wantSname &&
      !wantPhone &&
      !wantPass
    ) {
      return res.json({ ok: true, user: current });
    }

    // ÇAKIŞMA KONTROLÜ — ayrı ayrı ve id <> ?
    if (wantUsername) {
      const [du1] = await pool.query(
        "SELECT id FROM customers WHERE username = ? AND id <> ? LIMIT 1",
        [u, uid]
      );
      if (du1.length)
        return res.status(409).json({ error: "Kullanıcı adı kullanımda" });
    }
    if (wantEmail) {
      const [du2] = await pool.query(
        "SELECT id FROM customers WHERE email = ? AND id <> ? LIMIT 1",
        [e, uid]
      );
      if (du2.length)
        return res.status(409).json({ error: "E-posta kullanımda" });
    }

    // Dinamik UPDATE
    const set = [];
    const vals = [];

    if (wantFname) {
      set.push("fname = ?");
      vals.push(s(fname) || null);
    }
    if (wantSname) {
      set.push("sname = ?");
      vals.push(s(sname) || null);
    }
    if (wantUsername) {
      set.push("username = ?");
      vals.push(u);
    }
    if (wantEmail) {
      set.push("email = ?");
      vals.push(e);
    }

    if (wantPhone) {
      if (!ph) {
        set.push("phone = NULL");
        set.push("country_dial = NULL");
      } else {
        set.push("phone = ?");
        vals.push(ph);
        set.push("country_dial = ?");
        vals.push(cd);
      }
    }

    if (wantPass) {
      const hash = await bcrypt.hash(String(password), 10);
      set.push("password = ?");
      vals.push(hash);
    }

    if (set.length) {
      vals.push(uid);
      await pool.query(
        `UPDATE customers SET ${set.join(", ")} WHERE id = ?`,
        vals
      );
    }

    const [rows] = await pool.query(
      "SELECT id, username, email, fname, sname, country_dial AS countryDial, phone FROM customers WHERE id = ? LIMIT 1",
      [uid]
    );
    return res.json({ ok: true, user: rows[0] });
  } catch (err) {
    console.error("profile update error:", err);
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
