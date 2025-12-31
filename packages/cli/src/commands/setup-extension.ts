import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { installNativeMessagingManifest } from '../utils/extension';

export async function setupExtension(): Promise<void> {
  console.log('Setting up ATOSS CLI browser extension...\n');

  const extensionDir = path.join(__dirname, '../../extension');
  const distDir = path.join(extensionDir, 'dist');

  // Step 1: Build the extension
  console.log('1. Building extension...');
  try {
    // Check if extension directory exists
    try {
      await fs.access(extensionDir);
    } catch {
      console.error(`Error: Extension directory not found at ${extensionDir}`);
      process.exit(1);
    }

    // Install dependencies if needed
    const nodeModulesPath = path.join(extensionDir, 'node_modules');
    try {
      await fs.access(nodeModulesPath);
    } catch {
      console.log('   Installing extension dependencies...');
      execSync('npm install', { cwd: extensionDir, stdio: 'inherit' });
    }

    // Build the extension
    console.log('   Compiling TypeScript...');
    execSync('npm run build', { cwd: extensionDir, stdio: 'inherit' });
    console.log('   ✓ Extension built successfully\n');
  } catch (error) {
    console.error('Failed to build extension:', error);
    process.exit(1);
  }

  // Step 2: Show instructions for loading extension
  console.log('2. Load extension in Arc/Chrome:');
  console.log(`   a. Open Arc (or Chrome/Edge)`);
  console.log(`   b. Go to arc://extensions (or chrome://extensions)`);
  console.log(`   c. Enable "Developer mode" (toggle in top right)`);
  console.log(`   d. Click "Load unpacked"`);
  console.log(`   e. Select this folder: ${distDir}`);
  console.log(`   f. Copy the Extension ID (looks like: abcdefghijklmnopqrstuvwxyz123456)\n`);

  // Step 3: Ask for extension ID
  console.log('3. Install native messaging daemon:');
  console.log('   After loading the extension, you need to install the native messaging daemon.');
  console.log('   Run this command with your extension ID:\n');
  console.log(`   atoss-cli install-host <EXTENSION_ID>\n`);
  console.log(`   Example:`);
  console.log(`   atoss-cli install-host abcdefghijklmnopqrstuvwxyz123456\n`);

  console.log('✓ Extension setup complete!');
  console.log('  Once you\'ve loaded the extension and installed the daemon, just run:');
  console.log('  - atoss-cli get    (everything else is automatic!)');
}

export async function installHost(extensionId: string): Promise<void> {
  if (!extensionId || extensionId.length !== 32) {
    console.error('Error: Invalid extension ID');
    console.error('Extension ID should be 32 characters (a-z, 0-9)');
    console.error('\nGet your extension ID from arc://extensions');
    process.exit(1);
  }

  console.log(`Installing native messaging daemon for extension: ${extensionId}...\n`);

  const daemonPath = path.join(__dirname, '../native-host/daemon-launcher.sh');

  try {
    await installNativeMessagingManifest(daemonPath, extensionId);
    console.log('\n✓ Native messaging daemon installed successfully!');
    console.log('\nThe daemon will automatically start when you use the extension.');
    console.log('\nYou can now use:');
    console.log('  - atoss-cli get    (automatically opens tabs & extracts data!)');
    console.log('\nNo manual steps needed - just run commands and everything happens automatically.');
  } catch (error) {
    console.error('Failed to install native messaging daemon:', error);
    process.exit(1);
  }
}
