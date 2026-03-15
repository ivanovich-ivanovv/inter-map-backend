const mongoose = require("mongoose");

const CollectLog = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  item: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
  lat: Number,
  lng: Number,
  createdAt: { type: Date, default: Date.now },
  success: Boolean,
  reason: String,
});
module.exports = mongoose.model("CollectLog", CollectLog);
