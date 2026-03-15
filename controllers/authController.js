const jwt = require("jsonwebtoken");
const tokenBlacklist = require("../middleware/tokenBlacklist");

// Logout / revoke token
async function logout(req, res) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(400).json({ error: "no auth header" });
  const token = auth.split(" ")[1];
  if (!token) return res.status(400).json({ error: "no token" });

  // try to decode to obtain exp
  try {
    const decoded = jwt.decode(token);
    const exp = decoded?.exp || null; // seconds since epoch
    tokenBlacklist.add(token, exp);
    return res.json({ ok: true });
  } catch (e) {
    console.warn("logout decode failed", e);
    // still add token without exp (default TTL in blacklist will apply)
    tokenBlacklist.add(token, null);
    return res.json({ ok: true });
  }
}

module.exports = { logout };
