
const mongoose = require("mongoose");
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first'); // Khắc phục lỗi phân giải tên miền
dns.setServers(["8.8.8.8", "8.8.4.4"]);
async function connectDB(uri) {
  if (!uri) throw new Error("MONGO_URI is required");
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log("Mongo connected:", uri);
}

module.exports = { connectDB };
