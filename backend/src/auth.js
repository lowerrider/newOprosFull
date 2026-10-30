import jwt from "jsonwebtoken";

export function signToken(payload, secret) {
  return jwt.sign(payload, secret, { expiresIn: "12h" });
}

// role: "voter" | "admin"
export function requireRole(role, secret) {
  return (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Нужно войти" });
    try {
      const payload = jwt.verify(token, secret);
      if (payload.role !== role) {
        return res.status(403).json({ error: "Нет доступа" });
      }
      req.user = payload;
      next();
    } catch {
      res.status(401).json({ error: "Сессия истекла, войдите заново" });
    }
  };
}

// Простое ограничение попыток входа: не больше `limit` за `windowMs` с одного IP
export function loginLimiter({ limit = 10, windowMs = 15 * 60 * 1000 } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const entry = hits.get(key);
    if (!entry || entry.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count++;
    if (entry.count > limit) {
      return res
        .status(429)
        .json({ error: "Слишком много попыток, попробуйте через 15 минут" });
    }
    next();
  };
}
