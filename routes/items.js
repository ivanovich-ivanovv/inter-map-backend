const express = require("express");
const Item = require("../models/Item");
const User = require("../models/User");
const CollectLog = require("../models/CollectLog");
const { authMiddleware } = require("../middleware/auth");
const { metersBetween } = require("../utils/geo");

const router = express.Router();

router.post("/admin/seed", async (req, res) => {
  const center = { lat: 16.776, lng: 100.565 };
  const items = [
    {
      type: "monster",
      meta: { name: "Red Monster", modelUrl: "/models/monster01.glb" },
      location: { type: "Point", coordinates: [center.lng, center.lat] },
      expiresAt: new Date(Date.now() + 3600 * 1000),
    },
    {
      type: "coin",
      meta: { name: "Gold Coin" },
      location: { type: "Point", coordinates: [center.lng + 0.001, center.lat + 0.0005] },
      expiresAt: new Date(Date.now() + 1800 * 1000),
    },
  ];
  await Item.deleteMany({});
  await Item.insertMany(items);
  res.json({ ok: true });
});

router.get("/nearby", async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radius = parseFloat(req.query.radius) || 500;
  if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: "lat & lng required" });

  const items = await Item.find({
    collected: false,
    expiresAt: { $gt: new Date() },
    location: {
      $nearSphere: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
        $maxDistance: radius,
      },
    },
  })
    .lean()
    .limit(200);

  res.json(items);
});

router.post("/location", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { lat, lng } = req.body;
  if (typeof lat !== "number" || typeof lng !== "number") return res.status(400).json({ error: "lat/lng required" });

  const user = await User.findById(userId);
  const now = new Date();

  if (user && user.lastLocationAt && user.lastLocation && user.lastLocation.coordinates) {
    const [prevLng, prevLat] = user.lastLocation.coordinates;
    const dt = (now - user.lastLocationAt) / 1000; // seconds
    if (dt > 0) {
      const meters = metersBetween(prevLat, prevLng, lat, lng);
      const speedMps = meters / dt;
      const speedKmh = speedMps * 3.6;
      if (speedKmh > 80) {
        return res.status(400).json({ error: "speed suspicious", speedKmh });
      }
    }
  }

  await User.findByIdAndUpdate(
    userId,
    { lastLocation: { type: "Point", coordinates: [lng, lat] }, lastLocationAt: now },
    { new: true }
  );

  const radius = 500;
  const items = await Item.find({
    collected: false,
    expiresAt: { $gt: new Date() },
    location: {
      $nearSphere: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
        $maxDistance: radius,
      },
    },
  })
    .lean()
    .limit(200);

  res.json({ nearby: items });
});

router.post("/collect", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { itemId, lat, lng } = req.body;
  if (!itemId || typeof lat !== "number" || typeof lng !== "number") return res.status(400).json({ error: "itemId & lat/lng required" });

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "user not found" });

  if (user.lastCollectAt && Date.now() - user.lastCollectAt.getTime() < 2000) {
    return res.status(429).json({ error: "collecting too fast" });
  }

  const allowedDistance = 20; // meters
  const item = await Item.findById(itemId);
  if (!item) return res.status(404).json({ error: "item not found" });
  if (item.collected) return res.status(400).json({ error: "already collected" });
  if (item.expiresAt && item.expiresAt < new Date()) return res.status(400).json({ error: "expired" });

  const meters = metersBetween(item.location.coordinates[1], item.location.coordinates[0], lat, lng);
  if (meters > allowedDistance) {
    await CollectLog.create({ user: userId, item: itemId, lat, lng, success: false, reason: "too_far" });
    return res.status(400).json({ error: "too far", distanceMeters: meters });
  }

  const updated = await Item.findOneAndUpdate(
    { _id: itemId, collected: false },
    { $set: { collected: true, collectedBy: userId, collectedAt: new Date() } },
    { new: true }
  );
  if (!updated) {
    await CollectLog.create({ user: userId, item: itemId, lat, lng, success: false, reason: "race_or_collected" });
    return res.status(400).json({ error: "already collected (race condition)" });
  }

  user.lastCollectAt = new Date();
  await user.save();

  await CollectLog.create({ user: userId, item: itemId, lat, lng, success: true, reason: "ok" });

  res.json({ success: true, item: updated });
});

module.exports = router;
