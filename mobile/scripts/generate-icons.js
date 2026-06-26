const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.resolve(__dirname, '..', 'assets', 'images');
const SOURCE = path.join(ASSETS_DIR, 'groww_you_erp_logo_icon.png');

const ICON_BG_COLOR = { r: 10, g: 15, b: 29, alpha: 255 }; // #0A0F1D

const tasks = [
  // icon.png: app icon with opaque dark background (for Expo Go bundling screen / home screen)
  { png: 'icon.png', width: 1024, height: 1024, bg: ICON_BG_COLOR },
  // splash-icon.png: native splash image, transparent bg
  { png: 'splash-icon.png', width: 228, height: 228, bg: { r: 0, g: 0, b: 0, alpha: 0 } },
  // android-icon-foreground.png: adaptive icon foreground (transparent)
  { png: 'android-icon-foreground.png', width: 512, height: 512, bg: { r: 0, g: 0, b: 0, alpha: 0 } },
  // android-icon-background.png: solid color layer for adaptive icon mask
  { png: 'android-icon-background.png', width: 512, height: 512, bg: ICON_BG_COLOR, solid: true },
  // android-icon-monochrome.png: Android 13+ themed icon
  { png: 'android-icon-monochrome.png', width: 432, height: 432, bg: { r: 0, g: 0, b: 0, alpha: 0 } },
  // favicon.png: web favicon, transparent bg
  { png: 'favicon.png', width: 48, height: 48, bg: { r: 0, g: 0, b: 0, alpha: 0 } },
];

async function generate() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Source not found: ${SOURCE}`);
    process.exit(1);
  }

  const srcBuffer = fs.readFileSync(SOURCE);

  for (const task of tasks) {
    const pngPath = path.join(ASSETS_DIR, task.png);

    if (task.solid) {
      // Solid color background layers (e.g. android-icon-background.png)
      await sharp({
        create: {
          width: task.width,
          height: task.height,
          channels: 4,
          background: task.bg,
        },
      })
        .png()
        .toFile(pngPath);
    } else if (task.bg && task.bg.alpha > 0) {
      // Composite onto opaque background (e.g. icon.png)
      const overlay = await sharp(srcBuffer)
        .resize(task.width, task.height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      await sharp({
        create: {
          width: task.width,
          height: task.height,
          channels: 4,
          background: task.bg,
        },
      })
        .composite([{ input: overlay, top: 0, left: 0 }])
        .png()
        .toFile(pngPath);
    } else {
      await sharp(srcBuffer)
        .resize(task.width, task.height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(pngPath);
    }

    const stats = fs.statSync(pngPath);
    console.log(`OK: ${task.png} (${task.width}x${task.height}, ${(stats.size / 1024).toFixed(1)} KB)`);
  }
  console.log('\nDone!');
}

generate().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
