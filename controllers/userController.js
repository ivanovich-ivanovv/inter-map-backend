const userService = require("../services/userService");

async function getProfile(req, res) {
  try {
    const id = req.user && req.user.id;
    const user = await userService.getUserById(id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err) {
    console.error("getProfile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function updateProfile(req, res) {
  try {
    const id = req.user && req.user.id;
    const { displayName, lastLocation } = req.body;
    const data = {};
    if (displayName) data.displayName = displayName;
    if (lastLocation) data.lastLocation = lastLocation;
    const user = await userService.updateUser(id, data);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err) {
    console.error("updateProfile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = { getProfile, updateProfile };
