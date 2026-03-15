const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema({
  type: { type: String, required: true }, // monster | coin | artifact
  meta: { type: Object, default: {} }, // { name, modelUrl, rarity }
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  spawnedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date }, // optional
  collected: { type: Boolean, default: false },
  collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  collectedAt: { type: Date },
  cooldownSeconds: { type: Number, default: 0 }, // optional per item
});
ItemSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Item", ItemSchema);
