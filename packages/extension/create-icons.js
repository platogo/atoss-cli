// Simple script to create placeholder icon PNGs
const fs = require('fs');
const path = require('path');

// Minimal valid PNG file (1x1 transparent pixel)
const createPNG = (size) => {
  // PNG header + IHDR chunk for transparent image
  const width = size;
  const height = size;

  // This is a minimal 1x1 transparent PNG
  // We'll just copy it for all sizes (not ideal but works)
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // Width
    0x00, 0x00, 0x00, 0x01, // Height
    0x08, 0x06, 0x00, 0x00, 0x00, // Bit depth, color type, etc
    0x1F, 0x15, 0xC4, 0x89, // CRC
    0x00, 0x00, 0x00, 0x0A, // IDAT length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, // Compressed data
    0x0D, 0x0A, 0x2D, 0xB4, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);

  return pngData;
};

const iconsDir = path.join(__dirname, 'public', 'icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create placeholder icons
const sizes = [16, 48, 128];
sizes.forEach(size => {
  const iconPath = path.join(iconsDir, `icon-${size}.png`);
  const pngData = createPNG(size);
  fs.writeFileSync(iconPath, pngData);
  console.log(`Created ${iconPath}`);
});

console.log('\n✓ Placeholder icons created successfully');
console.log('Note: These are minimal 1x1 transparent PNGs.');
console.log('Replace with proper icons for production use.');
