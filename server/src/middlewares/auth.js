import jwt from "jsonwebtoken";

export function requireAuth(requiredRole) {
  return (req, res, next) => {
    try {
      const header = req.headers.authorization || "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : null;
      if (!token) return res.status(401).json({ error: "no token" });

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload; // { id, username, role }
      if (requiredRole && payload.role !== requiredRole)
        return res.status(403).json({ error: "forbidden" });

      next();
    } catch (e) {
      return res.status(401).json({ error: "invalid token" });
    }
  };
}
