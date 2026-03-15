// index.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");

const { connectDB } = require("./db");
const { requestLogger } = require("./middleware/logger");
const { createApiLimiter } = require("./config/limiter");

const authRoutes = require("./routes/auth");
const itemsRoutes = require("./routes/items");
const userRoutes = require("./routes/user");
const deviceRoutes = require("./routes/devices");

const { setupWebSocket } = require("./services/websocketHandler");
const arrivalDetector = require("./services/arrivalDetector");
const WifiScanner = require("./services/wifiScanner");

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// connect DB
connectDB(MONGO_URI).catch((err) => {
  console.error(err);
  process.exit(1);
});

const app = express();
const server = http.createServer(app);

// Initialize WebSocket
const io = setupWebSocket(server);

app.use(helmet());

// CORS configuration for tunnel support
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(requestLogger);
app.use(createApiLimiter());

// Serve generated audio files with proper headers
app.use("/audio", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Range");
  res.header("Accept-Ranges", "bytes");
  
  // Set proper MIME type for MP3
  if (req.path.endsWith('.mp3')) {
    res.type('audio/mpeg');
  }
  
  next();
}, express.static(path.join(__dirname, "audio")));

// mount modular routes
app.use("/auth", authRoutes);
app.use("/", itemsRoutes);
app.use("/user", userRoutes);
app.use("/devices", deviceRoutes);

// fallback / health
app.get("/healthz", (req, res) => res.json({ ok: true, ts: new Date() }));

// Start WiFi scanner (optional — depends on node-wifi availability)
const wifiScanner = new WifiScanner();
wifiScanner.init().then(() => {
  wifiScanner.start();
  wifiScanner.on("devices", (devices) => {
    devices.forEach((d) => arrivalDetector.updateDevice(d));
  });
});

// Start stale-device cleanup
arrivalDetector.startCleanup();

server.listen(PORT, () => console.log(`Server running on ${PORT}`));
