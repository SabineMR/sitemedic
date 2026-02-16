const fs = require('fs');
const path = require('path');

async function convertSVGtoPNG() {
  try {
    // Try to import sharp
    const sharp = require('sharp');

    const assetsDir = path.join(__dirname, 'assets');

    console.log('🔄 Converting SVG icons to PNG...\n');

    // Convert icon.svg to icon.png (1024x1024)
    await sharp(path.join(assetsDir, 'icon.svg'))
      .resize(1024, 1024)
      .png()
      .toFile(path.join(assetsDir, 'icon.png'));
    console.log('✅ Created icon.png (1024x1024)');

    // Convert adaptive-icon.svg to adaptive-icon.png (1024x1024)
    await sharp(path.join(assetsDir, 'adaptive-icon.svg'))
      .resize(1024, 1024)
      .png()
      .toFile(path.join(assetsDir, 'adaptive-icon.png'));
    console.log('✅ Created adaptive-icon.png (1024x1024)');

    // Convert splash-icon.svg to splash-icon.png (1024x1024)
    await sharp(path.join(assetsDir, 'splash-icon.svg'))
      .resize(1024, 1024)
      .png()
      .toFile(path.join(assetsDir, 'splash-icon.png'));
    console.log('✅ Created splash-icon.png (1024x1024)');

    // Convert favicon.svg to favicon.png (512x512 is good for web)
    await sharp(path.join(assetsDir, 'favicon.svg'))
      .resize(512, 512)
      .png()
      .toFile(path.join(assetsDir, 'favicon.png'));
    console.log('✅ Created favicon.png (512x512)');

    console.log('\n✨ All PNG icons created successfully!');
    console.log('\n📱 Next steps:');
    console.log('   1. Run: pnpm run ios (to rebuild for iOS)');
    console.log('   2. Or run: pnpm run android (to rebuild for Android)');
    console.log('   3. The new icon will appear on your simulator!');

  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('❌ Sharp package not found. Installing...');
      console.log('\n📦 Please run: pnpm add -D sharp');
      console.log('   Then run this script again: node convert-icon-to-png.js');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

convertSVGtoPNG();
