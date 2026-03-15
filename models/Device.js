const mongoose = require("mongoose");

const DeviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true, index: true },
  userName: { type: String, default: "Unknown" },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  rssi: { type: Number, default: 0 },
  estimatedDistance: { type: Number, default: null }, // meters (from RSSI)
  gpsDistance: { type: Number, default: null },       // meters (from GPS)
  status: {
    type: String,
    enum: ["detected", "moving", "arrived", "welcomed"],
    default: "detected",
  },
  lastSeen: { type: Date, default: Date.now },
  welcomedAt: { type: Date, default: null },
});

module.exports = mongoose.model("Device", DeviceSchema);
