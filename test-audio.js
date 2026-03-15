/**
 * Test audio generation
 */

const { generateWelcomeAudio } = require('./services/voiceWelcome');
const fs = require('fs');

async function test() {
  console.log('Testing gTTS audio generation...');
  
  try {
    const result = await generateWelcomeAudio('Test User', 'test-device-123');
    console.log('✓ Audio generated successfully!');
    console.log('  Filename:', result.filename);
    console.log('  Path:', result.filePath);
    console.log('  Text:', result.text);
    
    if (fs.existsSync(result.filePath)) {
      const stats = fs.statSync(result.filePath);
      // console.log('  File size:', stats.size, 'bytes');
      // console.log('\nTest audio URL: http://192.168.16.15:3000/audio/' + result.filename);
      // console.log('\nTry opening this URL in your browser to test!');
    } else {
      console.error('✗ File was not created!');
    }
  } catch (err) {
    console.error('✗ Test failed:', err.message);
    console.error(err);
  }
}

test();
