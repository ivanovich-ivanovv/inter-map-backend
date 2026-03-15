// Server machine GPS location — configure this to match the physical server position
// Can be overridden via environment variables: SERVER_LAT, SERVER_LNG

module.exports = {
  latitude: parseFloat(process.env.SERVER_LAT) || 10.0130682,
  longitude: parseFloat(process.env.SERVER_LNG) || 105.7308913,
  name: process.env.SERVER_NAME || "Đại học FPT phân hiệu Cần Thơ",
};

// 9.996687, 105.714262
