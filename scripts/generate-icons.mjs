// Generate original PWA icons with no native dependencies (pure Node + zlib).
// Draws a friendly rounded "home + check" mark. Not copied from any artwork.
//
// Outputs to client/public/icons and client/public.

import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../client/public');
const iconsDir = path.join(publicDir, 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

// ---- tiny PNG encoder -------------------------------------------------------
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- drawing helpers --------------------------------------------------------
function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

// Brand gradient (calm teal -> green) with a white check.
const TOP = [79, 158, 145]; // #4F9E91
const BOT = [95, 184, 120]; // #5FB878
const WHITE = [255, 255, 255];

function drawIcon(size, { maskable = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  // For maskable, keep content within a safe center; background fills all.
  const pad = maskable ? size * 0.0 : size * 0.06;
  const radius = maskable ? 0 : size * 0.22;
  const rectX0 = pad;
  const rectY0 = pad;
  const rectX1 = size - pad;
  const rectY1 = size - pad;

  const contentScale = maskable ? 0.7 : 0.82;
  const cx = size / 2;
  const cy = size / 2;
  const s = size * contentScale;

  // Checkmark points (relative to center), sized by s.
  const ax = cx - s * 0.22;
  const ay = cy + s * 0.02;
  const bx = cx - s * 0.06;
  const by = cy + s * 0.2;
  const dx2 = cx + s * 0.26;
  const dy2 = cy - s * 0.2;
  const stroke = s * 0.085;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Rounded-rect background mask.
      let inside = true;
      if (!maskable) {
        inside =
          x >= rectX0 && x <= rectX1 && y >= rectY0 && y <= rectY1;
        // corner rounding
        const corners = [
          [rectX0 + radius, rectY0 + radius],
          [rectX1 - radius, rectY0 + radius],
          [rectX0 + radius, rectY1 - radius],
          [rectX1 - radius, rectY1 - radius],
        ];
        if (inside) {
          const nearLeft = x < rectX0 + radius;
          const nearRight = x > rectX1 - radius;
          const nearTop = y < rectY0 + radius;
          const nearBot = y > rectY1 - radius;
          if ((nearLeft || nearRight) && (nearTop || nearBot)) {
            const cxn = nearLeft ? corners[0][0] : corners[1][0];
            const cyn = nearTop ? corners[0][1] : corners[2][1];
            if (Math.hypot(x - cxn, y - cyn) > radius) inside = false;
          }
        }
      }

      if (!inside) {
        rgba[i] = 0;
        rgba[i + 1] = 0;
        rgba[i + 2] = 0;
        rgba[i + 3] = 0;
        continue;
      }

      const t = y / size;
      let r = lerp(TOP[0], BOT[0], t);
      let g = lerp(TOP[1], BOT[1], t);
      let b = lerp(TOP[2], BOT[2], t);
      let a = 255;

      // Check mark (anti-aliased edge).
      const d = Math.min(
        distToSegment(x, y, ax, ay, bx, by),
        distToSegment(x, y, bx, by, dx2, dy2),
      );
      const edge = stroke / 2;
      if (d < edge + 1.2) {
        const alpha = Math.max(0, Math.min(1, edge + 0.6 - d));
        r = lerp(r, WHITE[0], alpha);
        g = lerp(g, WHITE[1], alpha);
        b = lerp(b, WHITE[2], alpha);
      }

      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = a;
    }
  }
  return encodePNG(size, size, rgba);
}

const outputs = [
  { file: path.join(iconsDir, 'icon-192.png'), size: 192 },
  { file: path.join(iconsDir, 'icon-512.png'), size: 512 },
  { file: path.join(iconsDir, 'maskable-192.png'), size: 192, maskable: true },
  { file: path.join(iconsDir, 'maskable-512.png'), size: 512, maskable: true },
  { file: path.join(iconsDir, 'apple-touch-icon.png'), size: 180 },
  { file: path.join(publicDir, 'favicon-32.png'), size: 32 },
  { file: path.join(publicDir, 'favicon-16.png'), size: 16 },
];

for (const o of outputs) {
  fs.writeFileSync(o.file, drawIcon(o.size, { maskable: o.maskable }));
  console.log('wrote', path.relative(publicDir, o.file));
}

// Also write an SVG favicon (crisp at any size).
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#4F9E91"/><stop offset="1" stop-color="#5FB878"/>
  </linearGradient></defs>
  <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#g)"/>
  <path d="M20 33 L28 41 L45 22" fill="none" stroke="#fff" stroke-width="6"
    stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svg);
console.log('wrote favicon.svg');
