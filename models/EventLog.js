const mongoose = require("mongoose");

const EventLogSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, index: true },
  userName: { type: String },
  event: {
    type: String,
    enum: ["detected", "moving", "arrived", "welcomed"],
    required: true,
  },
  message: { type: String },
  timestamp: { type: Date, default: Date.now },
});

// Auto-expire logs after 24 hours
EventLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model("EventLog", EventLogSchema);
