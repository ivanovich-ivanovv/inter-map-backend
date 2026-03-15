/**
 * Device Routes
 * -------------
 * POST /devices/update   — Receive device position updates
 * GET  /devices           — Return all tracked devices
 * GET  /server-location   — Return server GPS position
 * POST /devices/reset     — Reset all welcome sessions
 */

const express = require("express");
const jwt = require("jsonwebtoken");
const Device = require("../models/Device");
const User = require("../models/User");
const EventLog = require("../models/EventLog");
const arrivalDetector = require("../services/arrivalDetector");
const serverLocation = require("../config/serverLocation");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const router = express.Router();

// POST /devices/update — receive device update from companion app or WiFi scanner
router.post("/update", async (req, res) => {
  const { deviceId, userName, latitude, longitude, rssi, timestamp } = req.body;
  let persistedWelcomedAt = null;
  
  // Try to get displayName from JWT if available
  let displayName = userName;
  const authHeader = req.headers.authorization;
  if (authHeader) {
    try {
      const token = authHeader.split(" ")[1];
      const payload = jwt.verify(token, JWT_SECRET);
      // Query user to get displayName
      const user = await User.findById(payload.id);
      if (user && user.displayName) {
        displayName = user.displayName;
        console.log(`[Devices] User authenticated: ${displayName} (${user.email})`);
      }
    } catch (err) {
      // JWT verify failed or user not found - use userName fallback
      console.log("[Devices] No valid JWT, using userName:", userName);
    }
  }

  if (!deviceId || latitude == null || longitude == null) {
    return res
      .status(400)
      .json({ error: "deviceId, latitude, and longitude are required" });
  }

  // Validate coordinate ranges
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: "Invalid coordinates" });
  }

  try {
    const existingDevice = await Device.findOne({ deviceId })
      .select("welcomedAt")
      .lean();
    persistedWelcomedAt = existingDevice?.welcomedAt || null;
  } catch (err) {
    console.error("[Devices] DB lookup error:", err.message);
  }

  // Process through arrival detector
  const device = arrivalDetector.updateDevice({
    deviceId,
    userName: displayName, // Use displayName from User or fallback to userName
    latitude,
    longitude,
    rssi,
    timestamp,
    welcomedAt: persistedWelcomedAt,
  });

  // Persist to database
  try {
    await Device.findOneAndUpdate(
      { deviceId },
      {
        userName: displayName, // Use displayName here too
        latitude,
        longitude,
        rssi: device.rssi,
        estimatedDistance: device.estimatedDistance,
        gpsDistance: device.gpsDistance,
        status: device.status,
        lastSeen: new Date(),
        welcomedAt: device.welcomedAt ? new Date(device.welcomedAt) : null,
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error("[Devices] DB update error:", err.message);
  }

  res.json({ ok: true, device });
});

// DELETE /devices/:deviceId — remove device from active tracking without clearing welcome history
router.delete("/:deviceId", async (req, res) => {
  const { deviceId } = req.params;
  
  if (!deviceId) {
    return res.status(400).json({ error: "deviceId is required" });
  }

  // Remove from in-memory tracker
  const removed = arrivalDetector.removeDevice(deviceId);
  
  // Preserve the DB record so this device is only welcomed once across sessions.
  try {
    await Device.findOneAndUpdate(
      { deviceId },
      {
        lastSeen: new Date(),
        status: removed?.welcomedAt ? "welcomed" : "moving",
      }
    );
    console.log(`[Devices] Device removed from active tracking: ${deviceId}`);
  } catch (err) {
    console.error("[Devices] DB update error:", err.message);
  }

  res.json({ 
    ok: true, 
    removed: removed ? true : false,
    message: removed ? "Device removed successfully" : "Device not found"
  });
});

// GET /devices — return all currently tracked devices
router.get("/", async (req, res) => {
  const devices = arrivalDetector.getDevices();
  res.json({
    count: devices.length,
    serverLocation: {
      latitude: serverLocation.latitude,
      longitude: serverLocation.longitude,
      name: serverLocation.name,
    },
    devices,
  });
});

// GET /server-location — return server GPS position
router.get("/server-location", (req, res) => {
  res.json({
    latitude: serverLocation.latitude,
    longitude: serverLocation.longitude,
    name: serverLocation.name,
  });
});

// GET /devices/events — return recent event logs
router.get("/events", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const events = await EventLog.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// POST /devices/reset — reset all sessions
router.post("/reset", (req, res) => {
  arrivalDetector.resetAll();
  res.json({ ok: true, message: "All sessions reset" });
});

module.exports = router;
