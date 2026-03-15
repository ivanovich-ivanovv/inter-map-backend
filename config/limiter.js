const rateLimit = require("express-rate-limit");

function createApiLimiter(opts = {}) {
  return rateLimit({
    windowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS) || 60_000,
    max: Number(process.env.API_RATE_LIMIT_MAX) || 120,
    standardHeaders: true,
    legacyHeaders: false,
    ...opts,
  });
}

module.exports = { createApiLimiter };
