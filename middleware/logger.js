function requestLogger(req, res, next) {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log("Headers:", req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("Body:", {
      ...req.body,
      password: req.body.password ? "***" : undefined,
    });
  }
  next();
}

module.exports = { requestLogger };
