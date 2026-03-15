// Simple in-memory token blacklist with expiry cleanup
// Note: in-memory means revoked tokens are lost on server restart.
// For production, use a persistent store (Redis) with TTL.

const blacklist = new Map(); // token -> expiryMs

function add(token, expSeconds) {
  if (!token) return;
  const now = Date.now();
  let expiryMs = null;
  if (expSeconds) expiryMs = expSeconds * 1000;
  // If no exp provided, keep for 1 day by default
  if (!expiryMs) expiryMs = now + 24 * 60 * 60 * 1000;
  blacklist.set(token, expiryMs);
}

function isBlacklisted(token) {
  if (!token) return false;
  const exp = blacklist.get(token);
  if (!exp) return false;
  if (Date.now() > exp) {
    blacklist.delete(token);
    return false;
  }
  return true;
}

// Periodic cleanup of expired tokens
setInterval(() => {
  const now = Date.now();
  for (const [t, exp] of blacklist.entries()) {
    if (exp && now > exp) blacklist.delete(t);
  }
}, 60 * 60 * 1000); // every hour

module.exports = { add, isBlacklisted };
