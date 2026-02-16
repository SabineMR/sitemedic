const fs = require('fs');
const path = require('path');

// Create SVG with medical cross icon
function createMedicalIconSVG(size = 1024) {
  const crossWidth = size * 0.25;
  const crossHeight = size * 0.6;
  const centerX = size / 2;
  const centerY = size / 2;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background circle -->
  <circle cx="${centerX}" cy="${centerY}" r="${size * 0.45}" fill="#0066CC"/>

  <!-- Medical cross - vertical bar -->
  <rect x="${centerX - crossWidth/2}" y="${centerY - crossHeight/2}"
        width="${crossWidth}" height="${crossHeight}"
        fill="white" rx="${crossWidth * 0.1}"/>

  <!-- Medical cross - horizontal bar -->
  <rect x="${centerX - crossHeight/2}" y="${centerY - crossWidth/2}"
        width="${crossHeight}" height="${crossWidth}"
        fill="white" rx="${crossWidth * 0.1}"/>

  <!-- Optional: Add a subtle border -->
  <circle cx="${centerX}" cy="${centerY}" r="${size * 0.45}"
          fill="none" stroke="#004C99" stroke-width="${size * 0.02}"/>
</svg>`;
}

// Save SVG files
const assetsDir = path.join(__dirname, 'assets');

// Create icon.svg
fs.writeFileSync(
  path.join(assetsDir, 'icon.svg'),
  createMedicalIconSVG(1024),
  'utf8'
);

// Create adaptive-icon.svg (same design)
fs.writeFileSync(
  path.join(assetsDir, 'adaptive-icon.svg'),
  createMedicalIconSVG(1024),
  'utf8'
);

// Create splash-icon.svg
fs.writeFileSync(
  path.join(assetsDir, 'splash-icon.svg'),
  createMedicalIconSVG(1024),
  'utf8'
);

// Create favicon.svg (smaller, simpler version)
fs.writeFileSync(
  path.join(assetsDir, 'favicon.svg'),
  createMedicalIconSVG(512),
  'utf8'
);

console.log('✅ SVG icon files created successfully!');
console.log('📁 Files created:');
console.log('   - assets/icon.svg');
console.log('   - assets/adaptive-icon.svg');
console.log('   - assets/splash-icon.svg');
console.log('   - assets/favicon.svg');
console.log('\n📝 Next: Convert SVG to PNG using sharp package...');
