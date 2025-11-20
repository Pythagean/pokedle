// Simple Node script to generate maskable icons from an existing favicon
// Uses `sharp` (install with `npm i --save-dev sharp`)
// Writes `public/icons/icon-192.png` and `public/icons/icon-512.png`.

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, '..');
const iconsDir = path.join(root, 'public', 'icons');
const input = path.join(iconsDir, 'favicon-180.png');

if (!fs.existsSync(input)) {
  console.error('Input icon not found:', input);
  process.exit(1);
}

const outputs = [192, 512];

(async () => {
  try {
    for (const size of outputs) {
      const outPath = path.join(iconsDir, `icon-${size}.png`);
      console.log(`Generating ${outPath} from ${input} at ${size}x${size}...`);
      await sharp(input)
        .flatten({ background: '#ffffff' }) // replace any transparency with white background
        .resize(size, size, { fit: 'cover' })
        .png({ quality: 90, compressionLevel: 9 })
        .toFile(outPath);
    }
    console.log('Done. Generated maskable icons in public/icons.');
  } catch (err) {
    console.error('Error generating icons:', err);
    process.exit(2);
  }
})();
