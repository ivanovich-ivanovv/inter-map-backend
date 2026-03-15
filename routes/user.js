const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const userController = require("../controllers/userController");

const router = express.Router();

// GET /user/me - get current user profile
router.get("/me", authMiddleware, userController.getProfile);

// PUT /user/me - update profile
router.put("/me", authMiddleware, userController.updateProfile);

module.exports = router;
