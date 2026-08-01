const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const assetsDir = path.join(rootDir, 'assets');
const pngPath = path.join(assetsDir, 'vinyl.png');
const icoPath = path.join(assetsDir, 'icon.ico');

// 1. Ensure assets/icon.ico exists (convert from vinyl.png if needed)
if (!fs.existsSync(icoPath) && fs.existsSync(pngPath)) {
  console.log('Generating assets/icon.ico from assets/vinyl.png...');
  const pngBuf = fs.readFileSync(pngPath);
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);     // Reserved
  header.writeUInt16LE(1, 2);     // Image type: 1 = ICO
  header.writeUInt16LE(1, 4);     // Number of images: 1
  header.writeUInt8(0, 6);        // Width (0 = 256px+)
  header.writeUInt8(0, 7);        // Height (0 = 256px+)
  header.writeUInt8(0, 8);        // Color count
  header.writeUInt8(0, 9);        // Reserved
  header.writeUInt16LE(1, 10);    // Color planes
  header.writeUInt16LE(32, 12);   // Bits per pixel
  header.writeUInt32LE(pngBuf.length, 14); // Image size in bytes
  header.writeUInt32LE(22, 18);   // Offset of image data
  fs.writeFileSync(icoPath, Buffer.concat([header, pngBuf]));
}

// 2. Find Start Menu Programs folder
const appData = process.env.APPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Roaming');
const startMenuPrograms = path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs');
const shortcutPath = path.join(startMenuPrograms, 'Vinyle.lnk');

// 3. Find target electron executable
const electronExePath = path.join(rootDir, 'node_modules', 'electron', 'dist', 'electron.exe');

if (!fs.existsSync(electronExePath)) {
  console.error('Error: electron executable not found at', electronExePath);
  process.exit(1);
}

// 4. Create Windows shortcut (.lnk) via PowerShell WScript.Shell
const psScript = `
$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut('${shortcutPath.replace(/'/g, "''")}')
$sc.TargetPath = '${electronExePath.replace(/'/g, "''")}'
$sc.Arguments = '.'
$sc.WorkingDirectory = '${rootDir.replace(/'/g, "''")}'
$sc.IconLocation = '${icoPath.replace(/'/g, "''")}'
$sc.Description = 'Vinyle - Platine vinyle virtuelle pour Windows'
$sc.Save()
`;

try {
  const base64Script = Buffer.from(psScript, 'utf16le').toString('base64');
  execSync(`powershell -EncodedCommand ${base64Script}`, { stdio: 'inherit' });
  console.log(`Successfully created Start Menu shortcut at:\n${shortcutPath}`);
} catch (err) {
  console.error('Failed to create shortcut:', err.message);
  process.exit(1);
}
