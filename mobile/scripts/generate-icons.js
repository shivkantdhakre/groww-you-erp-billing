const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.resolve(__dirname, '..', 'assets', 'images');

const tasks = [
  { svg: 'icon.svg', png: 'icon.png', width: 1024, height: 1024 },
  { svg: 'icon.svg', png: 'splash-icon.png', width: 228, height: 228 },
  { svg: 'android-icon-foreground.svg', png: 'android-icon-foreground.png', width: 512, height: 512 },
  { svg: 'android-icon-background.svg', png: 'android-icon-background.png', width: 512, height: 512 },
  { svg: 'android-icon-monochrome.svg', png: 'android-icon-monochrome.png', width: 432, height: 432 },
  { svg: 'icon.svg', png: 'favicon.png', width: 48, height: 48 },
];

async function generate() {
  for (const task of tasks) {
    const svgPath = path.join(ASSETS_DIR, task.svg);
    const pngPath = path.join(ASSETS_DIR, task.png);

    if (!fs.existsSync(svgPath)) {
      console.error(`SKIP: ${task.svg} not found`);
      continue;
    }

    const svgBuffer = fs.readFileSync(svgPath);
    await sharp(svgBuffer)
      .resize(task.width, task.height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(pngPath);

    const stats = fs.statSync(pngPath);
    console.log(`OK: ${task.png} (${task.width}x${task.height}, ${(stats.size / 1024).toFixed(1)} KB)`);
  }
  console.log('\nDone!');
}

generate().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
