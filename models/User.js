const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true, index: true },
  passwordHash: { type: String, required: true },
  displayName: { type: String },
  role: { type: String, default: "player" },
  lastLocation: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
  },
  lastLocationAt: { type: Date },
  lastCollectAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});
UserSchema.index({ lastLocation: "2dsphere" });

module.exports = mongoose.model("User", UserSchema);
