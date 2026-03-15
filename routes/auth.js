const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const { signToken, authMiddleware } = require("../middleware/auth");
const { logout } = require("../controllers/authController");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email và mật khẩu là bắt buộc" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: "Email đã được sử dụng" });

    const hash = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      passwordHash: hash,
      displayName: displayName || email,
    });
    await user.save();

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName || email,
      },
    });
  } catch (e) {
    console.error("Register error:", e);
    if (e.code === 11000)
      return res.status(400).json({ error: "Email đã được sử dụng" });
    res.status(500).json({ error: "Lỗi server nội bộ" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email và mật khẩu là bắt buộc" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok)
      return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });

    const token = signToken(user);
    res.json({
      token,
      user: { id: user._id, email: user.email, displayName: user.displayName },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Lỗi server nội bộ" });
  }
});

// Logout (revoke token)
router.post("/logout", authMiddleware, logout);

module.exports = router;
