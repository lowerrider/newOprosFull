import jwt from "jsonwebtoken";

export function signToken(payload, secret) {
  return jwt.sign(payload, secret, { expiresIn: "12h" });
}

// role: "voter" | "admin" | "superadmin"
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

export function requireAnyRole(roles, secret) {
  return (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Нужно войти" });
    try {
      const payload = jwt.verify(token, secret);
      if (!roles.includes(payload.role)) {
        return res.status(403).json({ error: "Нет доступа" });
      }
      req.user = payload;
      next();
    } catch {
      res.status(401).json({ error: "Сессия истекла, войдите заново" });
    }
  };
}

// Ограничение неудачных попыток входа: не больше `limit` ошибок за `windowMs` для пары IP + email.
// Успешные входы не считаются: в офисе сотни людей могут заходить с одного IP.
export function createLoginGuard({ limit = 10, windowMs = 15 * 60 * 1000 } = {}) {
  const failures = new Map();
  const keyOf = (req) => `${req.ip}|${String(req.body?.email || "").trim().toLowerCase()}`;

  return {
    check(req, res, next) {
      const entry = failures.get(keyOf(req));
      if (entry && entry.resetAt > Date.now() && entry.count >= limit) {
        return res
          .status(429)
          .json({ error: "Слишком много неверных попыток, попробуйте через 15 минут" });
      }
      next();
    },
    fail(req) {
      const key = keyOf(req);
      const now = Date.now();
      const entry = failures.get(key);
      if (!entry || entry.resetAt < now) failures.set(key, { count: 1, resetAt: now + windowMs });
      else entry.count++;
    },
    succeed(req) {
      failures.delete(keyOf(req));
    },
  };
}
