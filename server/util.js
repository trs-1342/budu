const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access-secret";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh-secret";

function signAccess(user) {
  return jwt.sign({ sub: user.id }, ACCESS_SECRET, { expiresIn: "10m" });
}

function signRefresh(user) {
  return jwt.sign(
    { sub: user.id, ver: user.token_version || 1 },
    REFRESH_SECRET,
    {
      expiresIn: "30d",
    }
  );
}

function comparePasswords(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

function setRefreshCookie(res, token) {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    sameSite: "Lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 gün
  });
}

module.exports = {
  signAccess,
  signRefresh,
  setRefreshCookie,
  comparePasswords,
};
