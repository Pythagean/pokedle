const sharp = require('sharp')
// Generate maskable icons from a source PNG
async function build() {
  await sharp('icon.png').resize(512).toFile('out/maskable-512.png')
  console.log('Wrote maskable-512.png')
}
build().catch(e => { console.error(e); process.exit(1) })
