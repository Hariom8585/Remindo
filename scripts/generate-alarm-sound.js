const fs = require('fs');
const path = require('path');

function createWavAlarm(durationSec = 3.5, sampleRate = 44100) {
  const numSamples = Math.floor(durationSec * sampleRate);
  const dataSize = numSamples * 2; // 16-bit mono
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // FMT sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20);  // PCM format
  buffer.writeUInt16LE(1, 22);  // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  buffer.writeUInt16LE(2, 32);  // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // DATA sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Generate alarm pattern: repeated energetic pulses (900Hz and 1100Hz)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const cycleTime = t % 1.0; // 1 second loop cycle

    let sampleVal = 0;

    // 4 bursts per second at 0.0s, 0.15s, 0.3s, 0.45s; followed by 0.5s pause
    const burstIndex = Math.floor(cycleTime / 0.15);
    const inBurstTime = cycleTime % 0.15;

    if (burstIndex < 4 && inBurstTime < 0.10) {
      const freq = (burstIndex % 2 === 0) ? 920 : 1100;
      // Fade in/out envelope on each burst
      const env = Math.sin((inBurstTime / 0.10) * Math.PI);
      const tone = Math.sin(2 * Math.PI * freq * t);
      // Add slight harmonic for crisp alarm presence
      const harmonic = 0.25 * Math.sin(2 * Math.PI * (freq * 2) * t);
      sampleVal = (tone + harmonic) * env * 0.75;
    }

    // Clamp to 16-bit signed integer
    const intSample = Math.max(-32767, Math.min(32767, Math.floor(sampleVal * 32767)));
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer;
}

const wav = createWavAlarm();

// Target 1: Android res/raw directory
const androidRawDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', 'raw');
if (!fs.existsSync(androidRawDir)) {
  fs.mkdirSync(androidRawDir, { recursive: true });
}
const androidDest = path.join(androidRawDir, 'alarm.wav');
fs.writeFileSync(androidDest, wav);
console.log(`Generated Android alarm sound at: ${androidDest} (${wav.length} bytes)`);

// Target 2: Public directory for web fallback
const publicSoundsDir = path.join(__dirname, '..', 'public', 'sounds');
if (!fs.existsSync(publicSoundsDir)) {
  fs.mkdirSync(publicSoundsDir, { recursive: true });
}
const publicDest = path.join(publicSoundsDir, 'alarm.wav');
fs.writeFileSync(publicDest, wav);
console.log(`Generated Web alarm sound at: ${publicDest} (${wav.length} bytes)`);
