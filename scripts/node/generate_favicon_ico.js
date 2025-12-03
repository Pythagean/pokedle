const fs = require('fs')
const sharp = require('sharp')

// Simple helper: generate multi-size favicon.ico from PNGs
async function build() {
  const sizes = [16, 32, 48, 64]
  const imgs = await Promise.all(sizes.map(s => sharp('icon.png').resize(s).toBuffer()))
  // sharp doesn't write .ico natively; write individual PNGs for external tool
  for (let i = 0; i < sizes.length; i++) {
    fs.writeFileSync(`out/icon-${sizes[i]}.png`, imgs[i])
  }
  console.log('Wrote icons in out/')
}

build().catch(e => { console.error(e); process.exit(1) })
