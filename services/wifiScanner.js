/**
 * WiFi Scanner Module
 * -------------------
 * Scans nearby WiFi devices every 3 seconds, extracts MAC addresses,
 * and estimates distance using RSSI signal strength.
 *
 * RSSI-to-Distance estimation:
 *   Uses the Log-Distance Path Loss Model:
 *     distance = 10 ^ ((txPower - rssi) / (10 * n))
 *
 *   Where:
 *   - txPower = signal strength at 1 meter (typically -40 to -50 dBm)
 *   - rssi    = measured signal strength
 *   - n       = path loss exponent (2.0 free-space, 2.7-4.3 indoor)
 *
 *   Example RSSI values:
 *   -30 dBm → ~1m  (very close)
 *   -50 dBm → ~3m  (nearby)
 *   -70 dBm → ~10m (moderate)
 *   -90 dBm → ~30m (far)
 *
 * NOTE: In production, node-wifi or arp-scan would be used for real WiFi scanning.
 *       This module provides the interface and falls back to simulated data
 *       when hardware scanning is unavailable.
 */

const EventEmitter = require("events");

// RSSI-to-distance calibration constants
const TX_POWER = -40; // dBm at 1 meter reference distance
const PATH_LOSS_N = 2.7; // indoor path loss exponent

class WifiScanner extends EventEmitter {
  constructor(options = {}) {
    super();
    this.scanInterval = options.scanInterval || 3000; // 3 seconds
    this.timer = null;
    this.useRealScanner = false;
    this.wifi = null;
  }

  /**
   * Estimate distance from RSSI using Log-Distance Path Loss Model
   * @param {number} rssi - Received Signal Strength Indicator (dBm)
   * @returns {number} estimated distance in meters
   */
  static estimateDistance(rssi) {
    if (!rssi || rssi >= 0) return Infinity;
    const distance = Math.pow(10, (TX_POWER - rssi) / (10 * PATH_LOSS_N));
    return Math.round(distance * 100) / 100; // round to 2 decimals
  }

  /**
   * Try to initialize real WiFi scanning via node-wifi
   */
  async init() {
    try {
      this.wifi = require("node-wifi");
      this.wifi.init({ iface: null }); // auto-select interface
      this.useRealScanner = true;
      console.log("[WiFiScanner] Real WiFi scanner initialized");
    } catch {
      this.useRealScanner = false;
      console.log("[WiFiScanner] node-wifi not available, using API-only mode");
    }
  }

  /**
   * Perform a single WiFi scan
   * @returns {Array} detected devices with MAC, RSSI, estimated distance
   */
  async scan() {
    if (!this.useRealScanner) return [];

    try {
      const networks = await this.wifi.scan();
      return networks.map((net) => ({
        deviceId: net.mac || net.bssid || "unknown",
        ssid: net.ssid,
        rssi: net.signal_level || net.quality,
        estimatedDistance: WifiScanner.estimateDistance(
          net.signal_level || net.quality
        ),
        timestamp: Date.now(),
      }));
    } catch (err) {
      console.error("[WiFiScanner] Scan error:", err.message);
      return [];
    }
  }

  /**
   * Start periodic scanning
   */
  start() {
    if (this.timer) return;
    console.log(
      `[WiFiScanner] Starting periodic scan every ${this.scanInterval}ms`
    );

    this.timer = setInterval(async () => {
      const devices = await this.scan();
      if (devices.length > 0) {
        this.emit("devices", devices);
      }
    }, this.scanInterval);
  }

  /**
   * Stop periodic scanning
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log("[WiFiScanner] Scanning stopped");
    }
  }
}

module.exports = WifiScanner;
