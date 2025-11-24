/*
Generate a minimal ICO file that embeds an existing PNG (e.g. 32x32) as an ICO image.
Usage (PowerShell):
  node .\scripts\generate_favicon_ico.js --in public\icons\favicon-32.png --out public\favicon.ico

If you omit args, defaults are used (in: public/icons/favicon-32.png, out: public/favicon.ico).
This script does NOT depend on native libraries.
It writes a single-image ICO where the image data is the PNG bytes (supported by modern browsers).
*/

import fs from 'fs';
import path from 'path';

function usage() {
  console.log('Usage: node generate_favicon_ico.js --in <pngPath> --out <icoPath>');
}

const argv = process.argv.slice(2);
let inPath = 'public/icons/favicon-32.png';
let outPath = 'public/favicon.ico';
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--in' && argv[i+1]) { inPath = argv[i+1]; i++; }
  else if (argv[i] === '--out' && argv[i+1]) { outPath = argv[i+1]; i++; }
  else if (argv[i] === '--help' || argv[i] === '-h') { usage(); process.exit(0); }
}

if (!fs.existsSync(inPath)) {
  console.error('Input PNG not found:', inPath);
  process.exit(2);
}

const png = fs.readFileSync(inPath);
// Build ICO header
// ICONDIR: reserved(2) 0, type(2) 1, count(2)
const count = 1;
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type = 1 (icon)
header.writeUInt16LE(count, 4);

// ICONDIRENTRY (16 bytes):
// BYTE width; BYTE height; BYTE colorCount; BYTE reserved; WORD planes; WORD bitCount; DWORD bytesInRes; DWORD imageOffset
const entry = Buffer.alloc(16);
// width and height: use 0 to represent 256, but for 32 use 32
// If PNG has standard 32x32, write 32
entry.writeUInt8(32, 0); // width
entry.writeUInt8(32, 1); // height
entry.writeUInt8(0, 2);  // colorCount
entry.writeUInt8(0, 3);  // reserved
entry.writeUInt16LE(0, 4); // planes (0 for PNG in ICO)
entry.writeUInt16LE(0, 6); // bitCount (0 for PNG in ICO)
entry.writeUInt32LE(png.length, 8); // bytesInRes
const offset = header.length + entry.length; // image data offset
entry.writeUInt32LE(offset, 12);

// Compose file
const outBuf = Buffer.concat([header, entry, png]);

// Ensure output directory exists
const outDir = path.dirname(outPath);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, outBuf);
console.log('Wrote', outPath, 'from', inPath);
console.log('Size:', outBuf.length, 'bytes');
console.log('If Firefox still shows the old icon, try clearing site data or re-adding the bookmark.');
