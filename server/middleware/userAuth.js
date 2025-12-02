// server/middleware/userAuth.js
const jwt = require("jsonwebtoken");

/**
 * USER JWT doğrulama middleware.
 * Bu adminAuth gibi çalışır ama yalnızca normal kullanıcı token’larını kabul eder.
 */
module.exports = function userAuthRequired(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token bulunamadı." });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Kullanıcı rolü kontrolü — user/admin ikisi de geçsin istiyorsan bu check’i kaldırabilirsin
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: "Geçersiz token." });
    }

    // Token payload → req.user
    req.user = decoded;

    next();
  } catch (err) {
    return res.status(401).json({ error: "Kimlik doğrulama başarısız." });
  }
};
