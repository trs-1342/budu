// server/src/config/session.js
import session from "express-session";

// Memory store kullan (development için uygun)
export const sessionConfig = {
  secret: process.env.SESSION_SECRET || "your-session-secret-key",
  name: "budu.sid", // cookie ismi
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production", // HTTPS'de true
    httpOnly: true, // XSS koruması
    maxAge: 24 * 60 * 60 * 1000, // 24 saat
    sameSite: "lax", // CSRF koruması
  },
  rolling: true, // Her istekte cookie süresi yenilensin
};
export const sessionMiddleware = session(sessionConfig);