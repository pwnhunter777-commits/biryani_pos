const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'binary');
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(width, height, getPixel) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    raw[rowOffset] = 0; // filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }

  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

// Painter for Biryani POS icon
function getIconPixel(x, y, width, height, isMaskable = false) {
  // Normalize coordinates to 0..1
  let nx = x / width;
  let ny = y / height;

  // Background gradient: #2563eb (37, 99, 235) to #1e3a8a (30, 58, 138)
  const bgR = Math.round(37 - 7 * ny);
  const bgG = Math.round(99 - 41 * ny);
  const bgB = Math.round(235 - 97 * ny);

  // If not maskable, round corners with squircle
  if (!isMaskable) {
    const cx = (nx - 0.5) * 2;
    const cy = (ny - 0.5) * 2;
    // Superellipse / rounded rectangle distance
    const dist = Math.pow(Math.abs(cx), 4) + Math.pow(Math.abs(cy), 4);
    if (dist > 1.05) {
      return [0, 0, 0, 0]; // Transparent outside icon bounds
    }
  }

  // Inside icon:
  // Apply scale if maskable (keep within safe zone: 80% circle)
  let sx = nx;
  let sy = ny;
  if (isMaskable) {
    sx = (nx - 0.5) / 0.82 + 0.5;
    sy = (ny - 0.5) / 0.82 + 0.5;
    if (sx < 0 || sx > 1 || sy < 0 || sy > 1) {
      return [bgR, bgG, bgB, 255];
    }
  }

  // Draw Elements in normalized coords (0..1)
  // 1. Steam plumes (rising from pot lid around sy: 0.15 to 0.38)
  for (let plume of [-0.1, 0, 0.1]) {
    const px = 0.5 + plume + Math.sin(sy * 15 + plume * 10) * 0.025;
    const dx = Math.abs(sx - px);
    if (sy >= 0.12 && sy <= 0.38 && dx < 0.016) {
      // Golden / saffron steam: #fbbf24 (251, 191, 36)
      const alpha = 1 - (sy - 0.12) / 0.3;
      return [251, 191, 36, 255];
    }
  }

  // 2. Pot Lid / Rim (sy: 0.38 to 0.44, sx: 0.22 to 0.78)
  const lidDist = Math.pow((sx - 0.5) / 0.28, 2) + Math.pow((sy - 0.41) / 0.045, 2);
  if (lidDist <= 1.0) {
    if (lidDist > 0.85) return [255, 255, 255, 255];
    return [220, 235, 255, 255]; // slight soft blue inner lid
  }

  // 3. Pot Body (sy: 0.41 to 0.72)
  // Wider in middle, rounded bottom
  if (sy >= 0.41 && sy <= 0.72) {
    const potWidthFactor = 0.26 + Math.sin((sy - 0.41) / 0.31 * Math.PI) * 0.08;
    const dx = Math.abs(sx - 0.5);
    if (dx <= potWidthFactor) {
      // Inside Pot body
      // Outer pot border / body is white #ffffff
      // Center has POS Receipt Bill badge (sy: 0.48 to 0.65, sx: 0.42 to 0.58)
      if (sy >= 0.49 && sy <= 0.64 && dx <= 0.08) {
        // POS Bill Badge inside pot: Deep royal blue background
        // Bill receipt lines:
        if ((sy >= 0.52 && sy <= 0.535 && dx <= 0.06) ||
            (sy >= 0.55 && sy <= 0.565 && dx <= 0.04) ||
            (sy >= 0.58 && sy <= 0.595 && dx <= 0.06)) {
          return [255, 255, 255, 255]; // White receipt lines
        }
        if (sy >= 0.61 && sy <= 0.625 && dx <= 0.05) {
          return [245, 158, 11, 255]; // Gold total accent line
        }
        return [29, 78, 216, 255]; // Blue POS paper badge
      }
      return [255, 255, 255, 255];
    }
    // Handles on sides (sy: 0.42 to 0.50)
    if (sy >= 0.43 && sy <= 0.49) {
      const hDistL = Math.abs(sx - 0.21);
      const hDistR = Math.abs(sx - 0.79);
      if (hDistL <= 0.02 || hDistR <= 0.02) {
        return [255, 255, 255, 255];
      }
    }
  }

  // 4. Bottom "POS" Banner (sy: 0.78 to 0.88, sx: 0.26 to 0.74)
  const bannerDist = Math.pow((sx - 0.5) / 0.22, 2) + Math.pow((sy - 0.83) / 0.045, 2);
  if (bannerDist <= 1.0) {
    // Banner white pill
    // "POS" letters inside banner (sx: 0.38 to 0.62, sy: 0.805 to 0.855)
    // Draw letters 'P' 'O' 'S' in blue #1d4ed8
    const by = sy - 0.83; // -0.025 to 0.025
    // P: sx ~ 0.41..0.45
    if (sx >= 0.405 && sx <= 0.42) return [29, 78, 216, 255];
    if (sx > 0.42 && sx <= 0.445 && ((by >= -0.022 && by <= -0.012) || (by >= -0.005 && by <= 0.005) || (sx >= 0.435 && by >= -0.022 && by <= 0.005))) {
      return [29, 78, 216, 255];
    }
    // O: sx ~ 0.48..0.52
    const oDist = Math.pow((sx - 0.5) / 0.024, 2) + Math.pow(by / 0.02, 2);
    if (oDist <= 1.0 && oDist >= 0.4) {
      return [29, 78, 216, 255];
    }
    // S: sx ~ 0.55..0.59
    if (sx >= 0.55 && sx <= 0.59) {
      if ((by >= -0.022 && by <= -0.012) || (by >= -0.005 && by <= 0.005) || (by >= 0.012 && by <= 0.022)) {
        return [29, 78, 216, 255];
      }
      if (sx <= 0.565 && by < 0) return [29, 78, 216, 255];
      if (sx >= 0.575 && by > 0) return [29, 78, 216, 255];
    }

    return [255, 255, 255, 255];
  }

  // Fallback to background gradient
  return [bgR, bgG, bgB, 255];
}

const pubDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(pubDir)) {
  fs.mkdirSync(pubDir, { recursive: true });
}

console.log('Generating PWA icons...');

// 1. 192x192
const pwa192 = createPng(192, 192, (x, y, w, h) => getIconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(pubDir, 'pwa-192x192.png'), pwa192);
console.log('✓ pwa-192x192.png generated (' + pwa192.length + ' bytes)');

// 2. 512x512
const pwa512 = createPng(512, 512, (x, y, w, h) => getIconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(pubDir, 'pwa-512x512.png'), pwa512);
console.log('✓ pwa-512x512.png generated (' + pwa512.length + ' bytes)');

// 3. 512x512 maskable (with 15% safe zone margin)
const pwaMaskable = createPng(512, 512, (x, y, w, h) => getIconPixel(x, y, w, h, true));
fs.writeFileSync(path.join(pubDir, 'pwa-maskable-512x512.png'), pwaMaskable);
console.log('✓ pwa-maskable-512x512.png generated (' + pwaMaskable.length + ' bytes)');

// 4. apple-touch-icon.png (180x180)
const appleIcon = createPng(180, 180, (x, y, w, h) => getIconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(pubDir, 'apple-touch-icon.png'), appleIcon);
console.log('✓ apple-touch-icon.png generated (' + appleIcon.length + ' bytes)');

// 5. favicon-32x32
const fav32 = createPng(32, 32, (x, y, w, h) => getIconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(pubDir, 'favicon.ico'), fav32);
console.log('✓ favicon.ico generated');

console.log('All PWA icon assets generated successfully!');
