import fs from "node:fs";
import path from "node:path";

const SVG_CONTENT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="lb-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4F46E5" />
      <stop offset="50%" stop-color="#6366F1" />
      <stop offset="100%" stop-color="#06B6D4" />
    </linearGradient>
    <linearGradient id="lb-star" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>
    <filter id="lb-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#0f172a" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Squircle Base -->
  <rect width="64" height="64" rx="16" fill="url(#lb-bg)" />
  <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="15.25" stroke="white" stroke-opacity="0.25" fill="none" />

  <!-- Bold Architectural "L" -->
  <path
    d="M16 14C16 11.7909 17.7909 10 20 10H25C26.6569 10 28 11.3431 28 13V38C28 39.1046 28.8954 40 30 40H47C48.6569 40 50 41.3431 50 43V48C50 50.2091 48.2091 52 46 52H20C17.7909 52 16 50.2091 16 48V14Z"
    fill="white"
    filter="url(#lb-shadow)"
  />

  <!-- Milestone Star in Top Right -->
  <path
    d="M44 10C44 17 48.5 21 55.5 21C48.5 21 44 25 44 32C44 25 39.5 21 32.5 21C39.5 21 44 17 44 10Z"
    fill="url(#lb-star)"
    filter="url(#lb-shadow)"
  />
  <circle cx="44" cy="21" r="2.2" fill="white" />
</svg>`;

// Write public/favicon.svg
fs.writeFileSync("public/favicon.svg", SVG_CONTENT, "utf-8");
console.log("Created public/favicon.svg");

// Now create a valid 32x32 32-bit BMP-encoded ICO file for public/favicon.ico
const width = 32;
const height = 32;
const bpp = 32;

// Create 32x32 pixel buffer (BGRA format, bottom-to-top for DIB)
const pixelData = Buffer.alloc(width * height * 4);

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function inRoundedRect(x, y, rx, ry, rw, rh, r) {
  if (x < rx || x > rx + rw || y < ry || y > ry + rh) return false;
  // corners
  if (x < rx + r && y < ry + r) return dist(x, y, rx + r, ry + r) <= r;
  if (x > rx + rw - r && y < ry + r) return dist(x, y, rx + rw - r, ry + r) <= r;
  if (x < rx + r && y > ry + rh - r) return dist(x, y, rx + r, ry + rh - r) <= r;
  if (x > rx + rw - r && y > ry + rh - r) return dist(x, y, rx + rw - r, ry + rh - r) <= r;
  return true;
}

// Draw into 32x32 raster
for (let row = 0; row < height; row++) {
  // BMP stores rows bottom-to-top!
  const y = height - 1 - row;
  for (let x = 0; x < width; x++) {
    const idx = (row * width + x) * 4;

    // Check base squircle: (1, 1, 30, 30, r=8)
    if (!inRoundedRect(x, y, 1, 1, 30, 30, 7)) {
      // transparent
      pixelData[idx + 0] = 0;
      pixelData[idx + 1] = 0;
      pixelData[idx + 2] = 0;
      pixelData[idx + 3] = 0;
      continue;
    }

    // Default gradient background: Indigo (79, 70, 229) to Cyan (6, 182, 212)
    const t = (x + y) / 64;
    let r = Math.round(79 * (1 - t) + 6 * t);
    let g = Math.round(70 * (1 - t) + 182 * t);
    let b = Math.round(229 * (1 - t) + 212 * t);
    let a = 255;

    // Check "L" glyph:
    // Vertical stem: x in [7..12], y in [5..25]
    // Horizontal base: x in [7..24], y in [20..25]
    const inStem = x >= 7 && x <= 13 && y >= 6 && y <= 24;
    const inBase = x >= 7 && x <= 23 && y >= 19 && y <= 25;
    if (inStem || inBase) {
      r = 255;
      g = 255;
      b = 255;
      a = 255;
    }

    // Star at (22, 9)
    const dx = Math.abs(x - 22);
    const dy = Math.abs(y - 9);
    if ((dx === 0 && dy <= 4) || (dy === 0 && dx <= 4) || (dx <= 1 && dy <= 1)) {
      r = 251;
      g = 191;
      b = 36; // Amber gold
      if (dx === 0 && dy === 0) {
        r = 255;
        g = 255;
        b = 255;
      }
    }

    // BMP is BGRA!
    pixelData[idx + 0] = b;
    pixelData[idx + 1] = g;
    pixelData[idx + 2] = r;
    pixelData[idx + 3] = a;
  }
}

// AND mask (1 bit per pixel, row padded to 32 bits = 4 bytes per row)
const andMask = Buffer.alloc(width * height / 8);

// DIB Header (BITMAPINFOHEADER): 40 bytes
const dibHeader = Buffer.alloc(40);
dibHeader.writeUInt32LE(40, 0); // header size
dibHeader.writeInt32LE(width, 4); // width
dibHeader.writeInt32LE(height * 2, 8); // height (double height for ICO XOR+AND mask)
dibHeader.writeUInt16LE(1, 12); // color planes
dibHeader.writeUInt16LE(bpp, 14); // bits per pixel
dibHeader.writeUInt32LE(0, 16); // BI_RGB compression
dibHeader.writeUInt32LE(pixelData.length + andMask.length, 20); // image size
dibHeader.writeInt32LE(0, 24); // x pixels per meter
dibHeader.writeInt32LE(0, 28); // y pixels per meter
dibHeader.writeUInt32LE(0, 32); // colors used
dibHeader.writeUInt32LE(0, 36); // important colors

const imageTotalSize = dibHeader.length + pixelData.length + andMask.length;

// ICO Directory Header: 6 bytes
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // reserved
icoHeader.writeUInt16LE(1, 2); // type 1 = ICO
icoHeader.writeUInt16LE(1, 4); // 1 image

// ICO Directory Entry: 16 bytes
const icoEntry = Buffer.alloc(16);
icoEntry.writeUInt8(width, 0);
icoEntry.writeUInt8(height, 1);
icoEntry.writeUInt8(0, 2); // color count
icoEntry.writeUInt8(0, 3); // reserved
icoEntry.writeUInt16LE(1, 4); // color planes
icoEntry.writeUInt16LE(bpp, 6); // bits per pixel
icoEntry.writeUInt32LE(imageTotalSize, 8); // image byte size
icoEntry.writeUInt32LE(6 + 16, 12); // offset to DIB header (22)

const fullIco = Buffer.concat([icoHeader, icoEntry, dibHeader, pixelData, andMask]);
fs.writeFileSync("public/favicon.ico", fullIco);
console.log(`Created public/favicon.ico (${fullIco.length} bytes)`);
