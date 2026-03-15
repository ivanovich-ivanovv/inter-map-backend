const jwt = require("jsonwebtoken");
const tokenBlacklist = require("./tokenBlacklist");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

function signToken(user) {
  return jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "no auth" });
  const token = auth.split(" ")[1];
  if (!token) return res.status(401).json({ error: "no token" });

  // Check blacklist first
  if (tokenBlacklist.isBlacklisted(token)) {
    return res.status(401).json({ error: "token_revoked" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: "invalid token" });
  }
}

module.exports = { signToken, authMiddleware };
