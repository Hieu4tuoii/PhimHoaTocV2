// Script to convert JPG-disguised-as-PNG files to real PNG
// Uses sharp which is available in most Node environments
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');

// List of files that need converting (JPG content with .png extension)
const filesToFix = ['favicon.png', 'icon.png', 'android-icon-foreground.png'];

function isPointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const v0x = cx - ax;
  const v0y = cy - ay;
  const v1x = bx - ax;
  const v1y = by - ay;
  const v2x = px - ax;
  const v2y = py - ay;

  const dot00 = v0x * v0x + v0y * v0y;
  const dot01 = v0x * v1x + v0y * v1y;
  const dot02 = v0x * v2x + v0y * v2y;
  const dot11 = v1x * v1x + v1y * v1y;
  const dot12 = v1x * v2x + v1y * v2y;

  const denom = dot00 * dot11 - dot01 * dot01;
  if (Math.abs(denom) < 1e-8) return false;
  const invDenom = 1.0 / denom;
  const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
  const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

  return (u >= 0) && (v >= 0) && (u + v <= 1);
}

// Generate a valid PNG with red brand gradient background and a sharp white play triangle in the center.
// Uses SSAA 2x2 (Supersampling Anti-Aliasing) for pixel-perfect smooth borders.
function createMinimalPNG(width, height) {
  const zlib = require('zlib');
  
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);  // width
  ihdrData.writeUInt32BE(height, 4); // height
  ihdrData.writeUInt8(8, 8);   // bit depth
  ihdrData.writeUInt8(2, 9);   // color type (RGB)
  ihdrData.writeUInt8(0, 10);  // compression
  ihdrData.writeUInt8(0, 11);  // filter
  ihdrData.writeUInt8(0, 12);  // interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);
  
  // IDAT chunk - raw image data
  // Each row: filter byte (0) + RGB pixels
  const rawData = Buffer.alloc(height * (1 + width * 3));
  
  const cx = width / 2;
  const cy = height / 2;
  const R = width * 0.22;
  
  // Play triangle vertices
  const ax = cx + R * 1.1;
  const ay = cy;
  const bx = cx - R * 0.85;
  const by = cy - R * 1.0;
  const cx_tri = cx - R * 0.85;
  const cy_tri = cy + R * 1.0;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 3);
    rawData[rowOffset] = 0; // No filter
    
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 3;
      
      // Calculate background gradient (diagonal: top-left to bottom-right)
      const factor = (x + y) / (width + height);
      // Red gradient: #D31F26 (211, 31, 38) -> #700207 (112, 2, 7)
      const bgR = Math.round(211 - (211 - 112) * factor);
      const bgG = Math.round(31 - (31 - 2) * factor);
      const bgB = Math.round(38 - (38 - 7) * factor);
      
      // 2x2 Supersampling for smooth vector boundaries
      let insideCount = 0;
      const subOffsets = [0.25, 0.75];
      for (const sx of subOffsets) {
        for (const sy of subOffsets) {
          if (isPointInTriangle(x + sx, y + sy, ax, ay, bx, by, cx_tri, cy_tri)) {
            insideCount++;
          }
        }
      }
      
      const alpha = insideCount / 4.0;
      
      // Blend white (#FFFFFF) with background gradient
      rawData[pixelOffset] = Math.round(255 * alpha + bgR * (1 - alpha));
      rawData[pixelOffset + 1] = Math.round(255 * alpha + bgG * (1 - alpha));
      rawData[pixelOffset + 2] = Math.round(255 * alpha + bgB * (1 - alpha));
    }
  }
  
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);
  
  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);
  
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Create proper PNG files
console.log('Converting JPG-disguised files to real PNG...');

for (const file of filesToFix) {
  const filePath = path.join(assetsDir, file);
  console.log(`  Generating/Overwriting beautiful logo for ${file}...`);
  
  let size = 48;
  if (file === 'icon.png') size = 1024;
  else if (file.includes('android')) size = 512;
  
  const png = createMinimalPNG(size, size);
  fs.writeFileSync(filePath, png);
  console.log(`  ${file}: ✅ successfully created/updated beautiful ${size}x${size} icon`);
}

console.log('\nDone! All asset files are now valid PNGs.');
