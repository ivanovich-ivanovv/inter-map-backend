/**
 * WebSocket Handler
 * -----------------
 * Manages Socket.io connections for real-time device updates.
 *
 * Events emitted to clients:
 *   device:update   — device position/status changed
 *   device:arrived  — device entered 5m zone
 *   device:welcome  — welcome voice triggered
 *   device:removed  — device went stale
 *   event:log       — new event log entry
 *
 * Events received from clients:
 *   device:update   — client sends device position
 *   devices:reset   — reset all sessions
 */

const { Server } = require("socket.io");
const arrivalDetector = require("../services/arrivalDetector");
const { generateWelcomeAudio, getWelcomeText } = require("../services/voiceWelcome");
const EventLog = require("../models/EventLog");

function setupWebSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: true,
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/devices/live",
  });

  // Log event to database and broadcast
  async function logEvent(deviceId, userName, event, message) {
    const entry = { deviceId, userName, event, message, timestamp: new Date() };
    try {
      await EventLog.create(entry);
    } catch (err) {
      console.error("[WS] Event log save error:", err.message);
    }
    io.emit("event:log", entry);
  }

  // Wire up arrival detector events
  arrivalDetector.on("detected", (device) => {
    const msg = `${device.userName} detected (${device.gpsDistance}m away)`;
    console.log(`[Proximity] ${msg}`);
    logEvent(device.deviceId, device.userName, "detected", msg);
  });

  arrivalDetector.on("update", (device) => {
    io.emit("device:update", device);
  });

  arrivalDetector.on("arrived", (device) => {
    const msg = `${device.userName} arrived (${device.gpsDistance}m)`;
    console.log(`[Proximity] ${msg}`);
    io.emit("device:arrived", device);
    logEvent(device.deviceId, device.userName, "arrived", msg);
  });

  arrivalDetector.on("welcome", async (device) => {
    const welcomeText = getWelcomeText(device.userName);
    console.log(`[Voice] ${welcomeText}`);

    let audioUrl = null;
    try {
      const result = await generateWelcomeAudio(device.userName, device.deviceId);
      audioUrl = `/audio/${result.filename}`;
      console.log(`[Voice] Audio file created: ${result.filename}`);
      console.log(`[Voice] Audio URL: ${audioUrl}`);
      console.log(`[Voice] Audio path: ${result.filePath}`);
      
      // Verify file exists
      const fs = require('fs');
      if (fs.existsSync(result.filePath)) {
        const stats = fs.statSync(result.filePath);
        console.log(`[Voice] ✓ File exists, size: ${stats.size} bytes`);
      } else {
        console.error(`[Voice] ✗ File NOT found at: ${result.filePath}`);
      }
    } catch (err) {
      console.warn("[Voice] TTS failed, sending text-only welcome:", err.message);
      console.error("[Voice] Error details:", err);
    }

    io.emit("device:welcome", {
      deviceId: device.deviceId,
      userName: device.userName,
      text: welcomeText,
      audioUrl,
      timestamp: Date.now(),
    });

    logEvent(device.deviceId, device.userName, "welcomed",
      `Welcome message played for ${device.userName}`
    );
  });

  arrivalDetector.on("removed", (device) => {
    io.emit("device:removed", device);
  });

  arrivalDetector.on("reset", () => {
    io.emit("devices:reset");
  });

  // Handle client connections
  io.on("connection", (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    // Send current state to newly connected client
    socket.emit("devices:snapshot", {
      devices: arrivalDetector.getDevices(),
    });

    // Handle device updates from companion app
    socket.on("device:update", (data) => {
      if (!data || !data.deviceId) return;
      arrivalDetector.updateDevice(data);
    });

    // Handle session reset
    socket.on("devices:reset", () => {
      arrivalDetector.resetAll();
    });

    socket.on("disconnect", () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });

  console.log("[WS] WebSocket server initialized on path /devices/live");
  return io;
}

module.exports = { setupWebSocket };
