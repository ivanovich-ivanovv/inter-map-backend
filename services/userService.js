const User = require("../models/User");

async function getUserById(id) {
  if (!id) return null;
  return User.findById(id).select("-passwordHash").lean();
}

async function updateUser(id, data) {
  if (!id) throw new Error("missing id");
  return User.findByIdAndUpdate(id, data, { new: true }).select("-passwordHash").lean();
}

module.exports = { getUserById, updateUser };
