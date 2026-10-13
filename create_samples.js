const fs = require('fs');
const path = require('path');

const svg1 = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0B141A;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1F2C34;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="600" height="400" fill="url(#grad1)" rx="16"/>
  <rect x="20" y="20" width="560" height="360" fill="none" stroke="#25D366" stroke-width="2" rx="12" stroke-dasharray="8,8"/>
  <circle cx="300" cy="150" r="50" fill="#202C33" />
  <text x="300" y="160" font-family="system-ui, sans-serif" font-size="32" fill="#25D366" text-anchor="middle">🏎️</text>
  <text x="300" y="235" font-family="system-ui, sans-serif" font-size="24" fill="#E9EDEF" text-anchor="middle" font-weight="bold">Mercedes-Benz E-Class 2024</text>
  <text x="300" y="270" font-family="system-ui, sans-serif" font-size="16" fill="#8696A0" text-anchor="middle">Black Edition • 0-60 in 4.4s • Available for delivery</text>
  <text x="300" y="310" font-family="system-ui, sans-serif" font-size="20" fill="#25D366" text-anchor="middle" font-weight="600">$78,500 MSRP</text>
</svg>`;

const svg2 = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
  <defs>
    <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#111B21;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#202C33;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="600" height="400" fill="url(#grad2)" rx="16"/>
  <rect x="20" y="20" width="560" height="360" fill="none" stroke="#00A884" stroke-width="2" rx="12"/>
  <circle cx="300" cy="150" r="50" fill="#202C33" />
  <text x="300" y="160" font-family="system-ui, sans-serif" font-size="32" fill="#00A884" text-anchor="middle">⚡</text>
  <text x="300" y="235" font-family="system-ui, sans-serif" font-size="24" fill="#E9EDEF" text-anchor="middle" font-weight="bold">BMW M4 Competition</text>
  <text x="300" y="270" font-family="system-ui, sans-serif" font-size="16" fill="#8696A0" text-anchor="middle">Isle of Man Green • Twin Turbo 503 HP</text>
  <text x="300" y="310" font-family="system-ui, sans-serif" font-size="20" fill="#00A884" text-anchor="middle" font-weight="600">$84,200 MSRP</text>
</svg>`;

const dir = path.join(__dirname, 'public', 'uploads', 'quick-replies');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

fs.writeFileSync(path.join(dir, 'car1.jpg'), svg1);
fs.writeFileSync(path.join(dir, 'car2.jpg'), svg2);

// Create an audio placeholder (minimal valid WAV header)
const createDummyWav = () => {
  const sampleRate = 8000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const durationSec = 3;
  const numSamples = sampleRate * durationSec;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = numSamples * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Generate a gentle beep tone
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * 440 * t) * 0.3 * 32767;
    buffer.writeInt16LE(Math.floor(sample), 44 + i * 2);
  }

  return buffer;
};

const wavBuffer = createDummyWav();
fs.writeFileSync(path.join(__dirname, 'public', 'uploads', 'sample-voice.mp3'), wavBuffer);

console.log('Sample images and audio generated successfully.');
