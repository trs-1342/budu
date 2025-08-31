require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const rateLimit = require("express-rate-limit");
const {
  comparePasswords,
  signAccess,
  signRefresh,
  setRefreshCookie,
} = require("./util");
const db = require("./db");
const { durToMs, sha256Hex } = require("./util");

const app = express();
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

const ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:1001"; // 1001 portuna izin ver
app.use(
  cors({
    origin: ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ---------- JWT yardımcıları ----------
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TTL = process.env.ACCESS_TTL || "10m";
const REFRESH_TTL = process.env.REFRESH_TTL || "30d";

// function signAccess(u) {
//   return jwt.sign({ sub: u.id, role: u.role }, ACCESS_SECRET, {
//     expiresIn: ACCESS_TTL,
//   });
// }
// function signRefresh(u) {
//   const sid = randomUUID(); // jti benzeri
//   return jwt.sign({ sub: u.id, ver: u.token_version, sid }, REFRESH_SECRET, {
//     expiresIn: REFRESH_TTL,
//   });
// }
// function setRefreshCookie(res, token) {
//   res.cookie("refreshToken", token, {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production",
//     sameSite: "lax",
//     path: "/api/auth",
//     maxAge: durToMs(REFRESH_TTL) || 30 * 24 * 3600 * 1000,
//   });
// }
function clearRefreshCookie(res) {
  res.clearCookie("refreshToken", { path: "/api/auth" });
}

// ---------- Middleware ----------
function requireAuth(req, res, next) {
  const [type, tok] = String(req.headers.authorization || "").split(" ");
  if (type !== "Bearer" || !tok)
    return res.status(401).json({ message: "Unauthorized" });
  try {
    const p = jwt.verify(tok, ACCESS_SECRET);
    req.userId = p.sub;
    req.role = p.role;
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
}
function requireRole(role) {
  return (req, res, next) => {
    if (req.role !== role)
      return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

// ---------- Repo yardımcıları ----------
async function findUserByIdentifier(identifier) {
  if (!identifier) return null;
  const conn = await db.getConnection();
  try {
    if (identifier.includes("@")) {
      const [r] = await conn.query(
        "SELECT * FROM users WHERE email = ? LIMIT 1",
        [identifier]
      );
      return r[0] || null;
    } else {
      const [r] = await conn.query(
        "SELECT * FROM users WHERE username = ? LIMIT 1",
        [identifier]
      );
      return r[0] || null;
    }
  } finally {
    conn.release();
  }
}
async function findUserById(id) {
  const [r] = await db.query("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
  return r[0] || null;
}
async function createSession(userId, refreshToken, userAgent, ip) {
  const hash = sha256Hex(refreshToken);
  const expires = new Date(
    Date.now() + (durToMs(REFRESH_TTL) || 30 * 24 * 3600 * 1000)
  );
  await db.query(
    `INSERT INTO auth_sessions (user_id, refresh_hash, user_agent, ip_address, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, hash, userAgent || null, null, expires]
  );
}
async function getSessionByToken(refreshToken) {
  const hash = sha256Hex(refreshToken);
  const [r] = await db.query(
    `SELECT * FROM auth_sessions
     WHERE refresh_hash = ? AND revoked_at IS NULL AND expires_at > NOW() LIMIT 1`,
    [hash]
  );
  return r[0] || null;
}
async function rotateSession(refreshToken, newRefreshToken) {
  const oldHash = sha256Hex(refreshToken);
  const newHash = sha256Hex(newRefreshToken);
  const expires = new Date(
    Date.now() + (durToMs(REFRESH_TTL) || 30 * 24 * 3600 * 1000)
  );
  await db.query(
    `UPDATE auth_sessions
     SET refresh_hash = ?, expires_at = ?
     WHERE refresh_hash = ? AND revoked_at IS NULL`,
    [newHash, expires, oldHash]
  );
}
async function revokeSession(refreshToken) {
  const hash = sha256Hex(refreshToken);
  await db.query(
    `UPDATE auth_sessions SET revoked_at = NOW() WHERE refresh_hash = ?`,
    [hash]
  );
}
async function revokeAllSessionsForUser(userId) {
  await db.query(
    `UPDATE auth_sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL`,
    [userId]
  );
}
async function bumpTokenVersion(userId) {
  await db.query(
    `UPDATE users SET token_version = token_version + 1 WHERE id = ?`,
    [userId]
  );
}

// ---------- AUTH Routes ----------
app.post("/api/auth/login", async (req, res) => {
  const { identifier, password } = req.body;
  const [user] = await db.query(
    "SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1",
    [identifier, identifier]
  );

  if (!user) {
    return res.status(403).json({ message: "no-admin" });
  }

  const isValid = comparePasswords(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ message: "wrong-password" });
  }

  const accessToken = signAccess(user);
  const refreshToken = signRefresh(user);
  setRefreshCookie(res, refreshToken);

  const { password_hash, ...safeUser } = user;
  res.json({ accessToken, user: safeUser });
});

app.post("/api/auth/refresh", async (req, res) => {
  const tok = req.cookies?.refreshToken;
  if (!tok) return res.status(401).json({ message: "No refresh" });

  try {
    const payload = jwt.verify(tok, REFRESH_SECRET); // { sub, ver, sid }
    const u = await findUserById(payload.sub);
    if (!u || u.token_version !== payload.ver)
      return res.status(401).json({ message: "Invalid refresh" });

    const sess = await getSessionByToken(tok);
    if (!sess) return res.status(401).json({ message: "Invalid session" });

    const accessToken = signAccess(u);

    // Refresh rotation (güvenlik için önerilir)
    const newRefresh = signRefresh(u);
    await rotateSession(tok, newRefresh);
    setRefreshCookie(res, newRefresh);

    const { password_hash, ...safe } = u;
    res.json({ accessToken, user: safe });
  } catch {
    return res.status(401).json({ message: "Invalid refresh" });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  const tok = req.cookies?.refreshToken;
  if (tok) {
    try {
      const p = jwt.verify(tok, REFRESH_SECRET);
      await revokeSession(tok);
    } catch {}
  }
  clearRefreshCookie(res);
  res.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  const u = await findUserById(req.userId);
  if (!u) return res.status(401).json({ message: "Unauthorized" });
  const { password_hash, ...safe } = u;
  res.json(safe);
});

// ---------- ADMIN: Users (Ayarlar → Kullanıcılar) ----------
app.get(
  "/api/admin/users",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const { q = "", role = "" } = req.query;
    const like = `%${q}%`;
    const params = [];
    let sql = `SELECT id, username, name, email, role, is_active
             FROM users WHERE 1=1`;
    if (q) {
      sql += ` AND (username LIKE ? OR name LIKE ? OR email LIKE ?)`;
      params.push(like, like, like);
    }
    if (role) {
      sql += ` AND role = ?`;
      params.push(role);
    }
    sql += ` ORDER BY id DESC LIMIT 200`;
    const [rows] = await db.query(sql, params);
    res.json({ items: rows });
  }
);

app.get(
  "/api/admin/users/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const [rows] = await db.query(
      `SELECT id, username, name, email, role, is_active FROM users WHERE id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: "Bulunamadı" });
    res.json(rows[0]);
  }
);

app.post(
  "/api/admin/users",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const {
      username,
      name,
      email,
      role = "viewer",
      active = true,
      password,
    } = req.body || {};
    if (!username && !email)
      return res.status(400).json({ message: "Username veya email zorunlu" });
    if (!password || password.length < 10)
      return res.status(400).json({ message: "Şifre min 10 karakter" });

    const passHash = await bcrypt.hash(password, 10);
    try {
      const [r] = await db.query(
        `INSERT INTO users (username, name, email, role, is_active, password_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
        [
          username || null,
          name || "",
          email || null,
          role,
          active ? 1 : 0,
          passHash,
        ]
      );
      const [row] = await db.query(
        `SELECT id, username, name, email, role, is_active FROM users WHERE id = ?`,
        [r.insertId]
      );
      res.status(201).json(row[0]);
    } catch (e) {
      if (e && e.code === "ER_DUP_ENTRY") {
        return res
          .status(409)
          .json({ message: "Username veya email zaten var" });
      }
      throw e;
    }
  }
);

app.patch(
  "/api/admin/users/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const { name, email, role, active } = req.body || {};
    try {
      await db.query(
        `UPDATE users SET
         name = COALESCE(?, name),
         email = ?,
         role = COALESCE(?, role),
         is_active = COALESCE(?, is_active),
         updated_at = NOW()
       WHERE id = ?`,
        [
          name ?? null,
          email ?? null,
          role ?? null,
          active == null ? null : active ? 1 : 0,
          req.params.id,
        ]
      );
    } catch (e) {
      if (e && e.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ message: "Email zaten kullanımda" });
      }
      throw e;
    }
    const [row] = await db.query(
      `SELECT id, username, name, email, role, is_active FROM users WHERE id = ?`,
      [req.params.id]
    );
    res.json(row[0]);
  }
);

app.post(
  "/api/admin/users/:id/password",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    const { newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 10)
      return res.status(400).json({ message: "Şifre min 10 karakter" });
    const hash = await bcrypt.hash(newPassword, 10);

    await db.query(
      `UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?`,
      [hash, req.params.id]
    );
    // tüm cihazlardan çıkart: token_version++ + user oturumlarını revoke
    await bumpTokenVersion(req.params.id);
    await revokeAllSessionsForUser(req.params.id);

    res.json({ ok: true });
  }
);

app.delete(
  "/api/admin/users/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    await db.query(`DELETE FROM users WHERE id = ?`, [req.params.id]);
    res.json({ ok: true });
  }
);

// ---------- İlk admin yoksa seed (geçici) ----------
// İlk admin kullanıcısını oluştur (yetkilendirme gerektirmez)
app.post("/api/setup/first-admin", async (req, res) => {
  try {
    // Önceden bir admin var mı kontrol et
    const [r] = await db.query(
      `SELECT COUNT(*) AS c FROM users WHERE role='admin'`
    );

    if (r[0].c > 0) {
      return res
        .status(403)
        .json({ message: "Zaten bir admin kullanıcısı var." });
    }

    const { username, name, email, password } = req.body || {};

    if (!username || !name || !email || !password) {
      return res.status(400).json({ message: "Eksik alanlar var." });
    }

    if (password.length < 10) {
      return res
        .status(400)
        .json({ message: "Şifre en az 10 karakter olmalıdır." });
    }

    const passHash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO users (username, name, email, role, is_active, password_hash)
       VALUES (?, ?, ?, 'admin', 1, ?)`,
      [username, name, email, passHash]
    );

    const [rows] = await db.query(
      `SELECT id, username, name, email, role, is_active FROM users WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ message: "Kullanıcı adı veya email zaten var." });
    }
    console.error("First admin creation error:", e);
    res.status(500).json({ message: "Sunucu hatası." });
  }
});

// !

// Admin kullanıcısı var mı kontrol et
app.get("/api/setup/check-admin", async (req, res) => {
  try {
    const [r] = await db.query(
      `SELECT COUNT(*) AS c FROM users WHERE role='admin'`
    );
    res.json({ exists: r[0].c > 0 });
  } catch (error) {
    console.error("Admin kontrol hatası:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
});

const publicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dk
  max: 3, // dakikada 20 istek
});

app.post("/api/public/email", publicLimiter, async (req, res) => {
  try {
    // Footer formundan gelecek alanlar
    const { name = "Anonim", email, subject, message } = req.body || {};
    if (!message || String(message).trim().length === 0) {
      return res.status(400).json({ error: "message is required" });
    }

    const sql =
      "INSERT INTO email_messages (name, email, subject, content, created_at) VALUES (?, ?, ?, ?, NOW())";
    await db.query(sql, [name, email, subject, message]);
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

// ---------- MESAJ YÖNETİMİ ----------
// Tüm mesajları listele
app.get("/api/admin/messages", requireAuth, async (req, res) => {
  const { q = "", archived = "" } = req.query;
  const like = `%${q}%`;

  try {
    let sql = `
      SELECT id, name, email, subject, content, created_at
      FROM email_messages 
      WHERE 1=1
    `;
    const params = [];

    if (q) {
      sql += ` AND (name LIKE ? OR email LIKE ? OR subject LIKE ? OR content LIKE ?)`;
      params.push(like, like, like, like);
    }

    sql += ` ORDER BY created_at DESC`;

    const [rows] = await db.query(sql, params);

    // Mesajları formatlayalım
    const items = rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      subject: row.subject,
      content: row.content,
      createdAt: row.created_at,
      is_read: row.is_read || false,
      is_archived: row.is_archived || false,
    }));

    res.json({ items });
  } catch (error) {
    console.error("Mesajlar getirilirken hata:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
});

// Tekil mesaj getir
app.get("/api/admin/messages/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT id, name, email, subject, content, created_at 
       FROM email_messages WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Mesaj bulunamadı." });
    }

    const message = rows[0];

    res.json({
      id: message.id,
      name: message.name,
      email: message.email,
      subject: message.subject,
      content: message.content,
      created_at: message.created_at,
      is_read: message.is_read || false,
      is_archived: message.is_archived || false,
    });
  } catch (error) {
    console.error("Mesaj getirilirken hata:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
});

// Mesajı arşivle/arşivden çıkar
// Mesajı arşivle/arşivden çıkar
app.patch("/api/admin/messages/:id/archive", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { archived } = req.body;

  try {
    await db.query(
      `UPDATE email_messages SET is_archived = ? WHERE id = ?`, // contact_messages → email_messages
      [archived ? 1 : 0, id]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error("Mesaj arşivlenirken hata:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
});

// Mesajı sil
app.delete("/api/admin/messages/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    await db.query(
      `DELETE FROM email_messages WHERE id = ?`, // contact_messages → email_messages
      [id]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error("Mesaj silinirken hata:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
});

// Email yanıtı gönder
app.post("/api/admin/messages/:id/reply", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { subject, message } = req.body;

  try {
    // Önce mesajı al
    const [rows] = await db.query(
      `SELECT email FROM contact_messages WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Mesaj bulunamadı." });
    }

    const recipientEmail = rows[0].email;

    // Burada email gönderme işlemini yapın
    // Örnek: await sendEmail(recipientEmail, subject, message);
    console.log(
      `Email gönderiliyor: ${recipientEmail}, Konu: ${subject}, Mesaj: ${message}`
    );

    res.json({ ok: true, message: "Yanıt gönderildi." });
  } catch (error) {
    console.error("Yanıt gönderilirken hata:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
});

const pages = [
  { id: "1", title: "Ana Sayfa", slug: "anasayfa", updatedAt: new Date() },
  { id: "2", title: "Hakkımızda", slug: "hakkimizda", updatedAt: new Date() },
];

const posts = {
  1: [
    { id: "p1", title: "Hoş Geldiniz", createdAt: new Date() },
    { id: "p2", title: "Duyurular", createdAt: new Date() },
  ],
  2: [{ id: "p3", title: "Biz Kimiz?", createdAt: new Date() }],
};

app.get("/api/admin/pages", (req, res) => {
  res.json({ items: pages });
});

app.post("/api/admin/pages", (req, res) => {
  const { title, slug } = req.body;
  const newPage = {
    id: Date.now().toString(),
    title,
    slug,
    updatedAt: new Date(),
  };
  pages.push(newPage);
  res.json({ item: newPage });
});

app.get("/api/admin/pages/:id/posts", (req, res) => {
  const id = req.params.id;
  res.json({ items: posts[id] || [] });
});

const port = Number(process.env.PORT || 2431);
app.listen(port, () => {
  console.log("[API] Listening on :" + port, "origin:", ORIGIN);
});
