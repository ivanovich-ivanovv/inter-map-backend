/**
 * Device Simulator
 * ----------------
 * Simulates 20–50 devices moving toward the server location.
 * Sends position updates via HTTP POST to the backend.
 *
 * Usage:
 *   node simulateDevices.js [backendUrl] [deviceCount]
 *
 * Examples:
 *   node simulateDevices.js
 *   node simulateDevices.js http://localhost:3000 30
 */

const BACKEND_URL = process.argv[2] || "http://localhost:3000";
const DEVICE_COUNT = parseInt(process.argv[3]) || 30;
const UPDATE_INTERVAL = 2000; // 2 seconds between updates

const serverLocation = require("./config/serverLocation");

// Vietnamese names for realistic simulation
const NAMES = [
  "Nguyễn Văn A", "Trần Thị B", "Lê Văn C", "Phạm Thị D",
  "Hoàng Văn E", "Ngô Thị F", "Đặng Văn G", "Bùi Thị H",
  "Đỗ Văn I", "Hồ Thị K", "Vũ Văn L", "Dương Thị M",
  "Lý Văn N", "Trương Thị O", "Đinh Văn P", "Mai Thị Q",
  "Phan Văn R", "Tạ Thị S", "Châu Văn T", "Lương Thị U",
  "Cao Văn V", "Tô Thị W", "Hà Văn X", "Thái Thị Y",
  "Lưu Văn Z", "Nguyễn Thị AA", "Trần Văn BB", "Lê Thị CC",
  "Phạm Văn DD", "Hoàng Thị EE", "Võ Văn FF", "Đoàn Thị GG",
  "Trịnh Văn HH", "Nghiêm Thị II", "Kiều Văn JJ", "La Thị KK",
  "Quách Văn LL", "Từ Thị MM", "Dư Văn NN", "Âu Thị OO",
  "Tăng Văn PP", "Mạc Thị QQ", "Sơn Văn RR", "Ông Thị SS",
  "Khổng Văn TT", "Tiêu Thị UU", "Cù Văn VV", "Lục Thị WW",
  "Diệp Văn XX", "Nhan Thị YY",
];

function generateMAC() {
  const hex = () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  return `${hex()}:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}`;
}

function randomOffset(maxMeters) {
  // ~0.00001 degrees ≈ 1.11 meters
  const degPerMeter = 0.00001;
  return (Math.random() - 0.5) * 2 * maxMeters * degPerMeter;
}

// Create simulated devices at random positions 20-100m away from server
function createDevices(count) {
  const devices = [];
  for (let i = 0; i < count; i++) {
    const startDistance = 20 + Math.random() * 80; // 20-100 meters away
    const angle = Math.random() * 2 * Math.PI;
    const degPerMeter = 0.00001;

    devices.push({
      deviceId: generateMAC(),
      userName: NAMES[i % NAMES.length],
      latitude:
        serverLocation.latitude + Math.sin(angle) * startDistance * degPerMeter,
      longitude:
        serverLocation.longitude +
        Math.cos(angle) * startDistance * degPerMeter,
      rssi: -70 - Math.floor(Math.random() * 20), // -70 to -90
      speed: 0.5 + Math.random() * 1.5, // 0.5-2.0 m/s walking speed
      angle: angle + Math.PI, // heading toward server
      arrived: false,
    });
  }
  return devices;
}

// Move device toward server
function moveDevice(device) {
  if (device.arrived) return;

  const degPerMeter = 0.00001;
  const stepMeters = device.speed * (UPDATE_INTERVAL / 1000);

  // Add slight randomness to movement
  const jitter = (Math.random() - 0.5) * 0.3;
  const moveAngle = device.angle + jitter;

  device.latitude += Math.sin(moveAngle) * stepMeters * degPerMeter;
  device.longitude += Math.cos(moveAngle) * stepMeters * degPerMeter;

  // Recalculate approximate distance
  const dLat = device.latitude - serverLocation.latitude;
  const dLng = device.longitude - serverLocation.longitude;
  const approxDistance =
    Math.sqrt(dLat * dLat + dLng * dLng) / degPerMeter;

  // Update RSSI based on distance
  device.rssi = Math.round(-40 - 27 * Math.log10(Math.max(approxDistance, 1)));

  if (approxDistance <= 3) {
    device.arrived = true;
  }
}

async function sendUpdate(device) {
  const payload = {
    deviceId: device.deviceId,
    userName: device.userName,
    latitude: device.latitude,
    longitude: device.longitude,
    rssi: device.rssi,
    timestamp: Date.now(),
  };

  try {
    const response = await fetch(`${BACKEND_URL}/devices/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (data.device && data.device.status === "welcomed") {
      console.log(`🎉 ${device.userName} was welcomed!`);
    }
  } catch (err) {
    // Server might not be running yet
  }
}

// Main simulation loop
async function main() {
  console.log(`\n🏫 Smart Campus Device Simulator`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Backend:  ${BACKEND_URL}`);
  console.log(`Devices:  ${DEVICE_COUNT}`);
  console.log(`Server:   ${serverLocation.latitude}, ${serverLocation.longitude}`);
  console.log(`Interval: ${UPDATE_INTERVAL}ms\n`);

  const devices = createDevices(DEVICE_COUNT);
  console.log(`Created ${devices.length} simulated devices\n`);

  let tick = 0;
  const interval = setInterval(async () => {
    tick++;
    const active = devices.filter((d) => !d.arrived);

    if (active.length === 0) {
      console.log("\n✅ All devices have arrived! Simulation complete.");
      clearInterval(interval);
      return;
    }

    console.log(
      `[Tick ${tick}] Active: ${active.length}/${devices.length} devices`
    );

    for (const device of devices) {
      moveDevice(device);
      await sendUpdate(device);
    }
  }, UPDATE_INTERVAL);

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n🛑 Simulation stopped");
    clearInterval(interval);
    process.exit(0);
  });
}

main();
