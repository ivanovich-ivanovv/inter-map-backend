/**
 * Voice Welcome Service
 * ---------------------
 * Generates Vietnamese TTS audio using Google Text-to-Speech (gTTS - free).
 *
 * Uses gTTS Python package which provides high-quality Vietnamese TTS
 * without requiring API keys or authentication.
 *
 * Install: pip install gTTS
 */

const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");

const AUDIO_DIR = path.join(__dirname, "..", "audio");
const SERVER_NAME =
  process.env.SERVER_NAME || "Đại học FPT phân hiệu Cần Thơ";

// Ensure audio directory exists
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

/**
 * Generate welcome message text
 * @param {string} userName
 * @returns {string} Vietnamese welcome message
 */
function getWelcomeText(userName) {
  return `Chào mừng ${userName} đã đến với ${SERVER_NAME}`;
}

/**
 * Generate TTS audio file using gTTS
 * @param {string} userName - person's name
 * @param {string} deviceId - device identifier (used for filename)
 * @returns {Promise<string>} path to generated audio file
 */
async function generateWelcomeAudio(userName, deviceId) {
  const text = getWelcomeText(userName);
  // Sanitize deviceId for filename
  const safeId = deviceId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `welcome_${safeId}_${Date.now()}.mp3`;
  const outputPath = path.join(AUDIO_DIR, filename);

  return new Promise((resolve, reject) => {
    // Use gTTS via Python (pip install gTTS)
    const pythonScript = `
from gtts import gTTS
import sys
text = sys.argv[1]
output = sys.argv[2]
tts = gTTS(text=text, lang='vi', slow=False)
tts.save(output)
print('OK')
`;

    const args = ["-c", pythonScript, text, outputPath];

    execFile("python", args, { timeout: 15000 }, (error, stdout, stderr) => {
      if (error) {
        // Fallback: try python3
        execFile(
          "python3",
          args,
          { timeout: 15000 },
          (err2, stdout2, stderr2) => {
            if (err2) {
              console.error("[VoiceWelcome] gTTS generation failed:", err2.message);
              console.error("[VoiceWelcome] stderr:", stderr2);
              return reject(err2);
            }
            console.log(`[VoiceWelcome] Audio generated (gTTS): ${filename}`);
            resolve({ filePath: outputPath, filename, text });
          }
        );
        return;
      }
      console.log(`[VoiceWelcome] Audio generated (gTTS): ${filename}`);
      resolve({ filePath: outputPath, filename, text });
    });
  });
}

/**
 * Clean up old audio files (older than 1 hour)
 */
function cleanupOldAudio() {
  const ONE_HOUR = 3600000;
  const now = Date.now();

  try {
    const files = fs.readdirSync(AUDIO_DIR);
    for (const file of files) {
      const filePath = path.join(AUDIO_DIR, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > ONE_HOUR) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (err) {
    console.error("[VoiceWelcome] Cleanup error:", err.message);
  }
}

// Run cleanup every 30 minutes
setInterval(cleanupOldAudio, 1800000);

module.exports = { generateWelcomeAudio, getWelcomeText };
