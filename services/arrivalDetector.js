/**
 * Arrival Detection Service
 * -------------------------
 * Monitors device positions and detects when a device enters
 * the 5-meter proximity zone around the server machine.
 *
 * Responsibilities:
 *   - Track all active devices
 *   - Calculate GPS distance using Haversine formula
 *   - Detect arrival (distance <= 5m)
 *   - Prevent duplicate welcomes per session
 *   - Emit events for voice welcome and UI updates
 */

const EventEmitter = require("events");
const { metersBetween } = require("../utils/geo");
const serverLocation = require("../config/serverLocation");
const WifiScanner = require("./wifiScanner");

const ARRIVAL_THRESHOLD = 5; // meters
const STALE_TIMEOUT = 60000; // 60 seconds — mark device stale if no update

class ArrivalDetector extends EventEmitter {
  constructor() {
    super();
    // deviceId -> { deviceId, userName, lat, lng, rssi, status, lastSeen, welcomedAt }
    this.devices = new Map();
    this.cleanupTimer = null;
  }

  /**
   * Update a device's position and check for arrival
   * @param {Object} data - device payload
   * @returns {Object} updated device state
   */
  updateDevice(data) {
    const { deviceId, userName, latitude, longitude, rssi, timestamp, welcomedAt: persistedWelcomedAt } = data;
    if (!deviceId) return null;

    const now = Date.now();
    const existing = this.devices.get(deviceId);

    // Calculate GPS distance from server
    const gpsDistance = metersBetween(
      latitude,
      longitude,
      serverLocation.latitude,
      serverLocation.longitude
    );

    // Estimate distance from RSSI if available
    const rssiDistance = rssi ? WifiScanner.estimateDistance(rssi) : null;

    // Determine status
    let status = "moving";
    let welcomedAt = existing?.welcomedAt || persistedWelcomedAt || null;

    if (gpsDistance <= ARRIVAL_THRESHOLD) {
      if (welcomedAt) {
        status = "welcomed"; // already welcomed this session
      } else {
        status = "arrived";
      }
    } else if (!existing) {
      status = "detected";
    }

    const device = {
      deviceId,
      userName: userName || existing?.userName || "Unknown",
      latitude,
      longitude,
      rssi: rssi || 0,
      estimatedDistance: rssiDistance,
      gpsDistance: Math.round(gpsDistance * 100) / 100,
      status,
      lastSeen: now,
      welcomedAt,
    };

    this.devices.set(deviceId, device);

    // Emit appropriate events
    if (!existing && status === "detected") {
      this.emit("detected", device);
    }

    if (status === "arrived" && !welcomedAt) {
      // Mark as welcomed
      device.status = "welcomed";
      device.welcomedAt = now;
      this.devices.set(deviceId, device);

      this.emit("arrived", device);
      this.emit("welcome", device);
    }

    this.emit("update", device);
    return device;
  }

  /**
   * Get all currently tracked devices
   */
  getDevices() {
    return Array.from(this.devices.values());
  }

  /**
   * Get a specific device by ID
   */
  getDevice(deviceId) {
    return this.devices.get(deviceId) || null;
  }

  /**
   * Remove a device from tracking (e.g. on logout)
   */
  removeDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (device) {
      this.devices.delete(deviceId);
      this.emit("removed", device);
      console.log(`[ArrivalDetector] Device removed: ${deviceId}`);
      return device;
    }
    return null;
  }

  /**
   * Reset welcome status for a device (allows re-greeting)
   */
  resetWelcome(deviceId) {
    const device = this.devices.get(deviceId);
    if (device) {
      device.welcomedAt = null;
      device.status = "detected";
      this.devices.set(deviceId, device);
    }
  }

  /**
   * Reset all sessions (clear all welcome flags)
   */
  resetAll() {
    this.devices.clear();
    this.emit("reset");
  }

  /**
   * Start stale-device cleanup
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [id, device] of this.devices) {
        if (now - device.lastSeen > STALE_TIMEOUT) {
          this.devices.delete(id);
          this.emit("removed", device);
        }
      }
    }, 10000);
  }

  /**
   * Stop cleanup timer
   */
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Singleton instance
module.exports = new ArrivalDetector();
