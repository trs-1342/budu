// ! WOOOOOOOOOOOWWW THIS IS A SERVER FILE
require("dotenv").config({ override: true });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const mysql = require("mysql2/promise");
const rateLimit = require("express-rate-limit");

const app = express();

const {
  PORT = 1002,
  JWT_SECRET = "buNeyYaaa1342",
  DB_HOST = "localhost",
  DB_USER = "root",
  DB_PASS = "password",
  DB_NAME = "BUDU",
  CLIENT_ORIGIN = "http://192.168.1.120:1001", // react dev server (vite)
} = process.env;

app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);

let pool;
(async () => {
  pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    connectionLimit: 10,
    namedPlaceholders: true,
  });
})();

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

function auth(req, res, next) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data; // { sub, username }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ---- Public: e‑posta / bülten
const emailLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dk
  max: 5, // dakikada en fazla 5 istek
  standardHeaders: true,
  legacyHeaders: false,
});

const publicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dk
  max: 3, // dakikada 20 istek
});

app.get("/api/health", (_, res) => res.json({ ok: true }));

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password)
      return res.status(400).json({ error: "username & password required" });
    if (username.length > 30)
      return res.status(400).json({ error: "username too long" });

    const hash = await bcrypt.hash(password, 12);

    // createdAt zaten DEFAULT CURRENT_TIMESTAMP, NOW() yazmasan da olur.
    const sql = "INSERT INTO users (username, password) VALUES (?, ?)";
    await pool.execute(sql, [username, hash]); // <-- DÜZELTME

    return res.status(201).json({ ok: true });
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "username already exists" });
    }
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password)
      return res.status(400).json({ error: "username & password required" });

    const [rows] = await pool.execute(
      "SELECT id, username, password FROM users WHERE username = :u LIMIT 1",
      { u: username }
    );
    if (!rows.length) return res.status(401).json({ error: "invalid creds" });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "invalid creds" });

    const token = signToken({ id: user.id, username: user.username });
    return res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

// GET /api/auth/me (Bearer token)
app.get("/api/auth/me", auth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, username, createdAt FROM users WHERE id = :id LIMIT 1",
      { id: req.user.id }
    );
    if (!rows.length) return res.status(404).json({ error: "not found" });
    return res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

app.post("/api/public/email", publicLimiter, async (req, res) => {
  try {
    // Footer formundan gelecek alanlar
    const { name = "", email = "", message } = req.body || {};
    if (!message || String(message).trim().length === 0) {
      return res.status(400).json({ error: "message is required" });
    }

    const sql =
      "INSERT INTO email_messages (username, email, message, createdAt) VALUES (?, ?, ?, NOW())";
    await pool.execute(sql, [name, email, message]);
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

// app.post("/api/email", emailLimiter, async (req, res) => {
//   const { name = "", email = "", message = "" } = req.body || {};
//   // basit doğrulamalar
//   if (!message.trim())
//     return res.status(400).json({ error: "Mesaj boş olamaz" });
//   if (message.length > 5000)
//     return res.status(400).json({ error: "Mesaj çok uzun" });

//   const who = `${String(name).trim()} <${String(email).trim()}>`.trim();
//   try {
//     const sql = "INSERT INTO EmailMessages (username, message) VALUES (?, ?)";
//     const [r] = await pool.execute(sql, [who || "anonymous", message.trim()]);
//     return res.status(201).json({ id: r.insertId, ok: true });
//   } catch (e) {
//     console.error(e);
//     return res.status(500).json({ error: "DB error" });
//   }
// });

app.post("/api/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password)
      return res.status(400).json({ error: "username and password required" });

    const [rows] = await pool.execute(
      "SELECT id, username, password FROM users WHERE username=? LIMIT 1",
      [username]
    );
    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const user = rows[0];

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { sub: user.id, username: user.username },
      JWT_SECRET,
      {
        expiresIn: "12h",
      }
    );
    return res.json({ token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/admin/messages", auth, async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, user_id, message, createdAt FROM email_messages ORDER BY id DESC"
    );
    return res.json({ items: rows });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/admin/ping", auth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

app.get("/", (req, res) => {
  console.log("Health check request received");
  res.send("server is running, go to <a href='http://192.168.1.120:1001'>client</a>");
});

app.listen(PORT, () => {
  console.log(`API listening on http://192.168.1.120:${PORT}`);
});
