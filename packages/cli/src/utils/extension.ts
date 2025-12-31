import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Get paths for native messaging manifest installation
export function getNativeMessagingPaths(): string[] {
  const homeDir = os.homedir();
  const paths: string[] = [];

  if (process.platform === 'darwin') {
    // macOS
    paths.push(
      path.join(homeDir, 'Library/Application Support/Google/Chrome/NativeMessagingHosts'),
      path.join(homeDir, 'Library/Application Support/Microsoft Edge/NativeMessagingHosts'),
      path.join(homeDir, 'Library/Application Support/Arc/NativeMessagingHosts'),
      path.join(homeDir, 'Library/Application Support/Chromium/NativeMessagingHosts')
    );
  } else if (process.platform === 'linux') {
    // Linux
    paths.push(
      path.join(homeDir, '.config/google-chrome/NativeMessagingHosts'),
      path.join(homeDir, '.config/chromium/NativeMessagingHosts')
    );
  } else if (process.platform === 'win32') {
    // Windows (registry-based, but we can still provide paths)
    paths.push(
      path.join(process.env.APPDATA || '', 'Google/Chrome/NativeMessagingHosts'),
      path.join(process.env.APPDATA || '', 'Microsoft/Edge/NativeMessagingHosts')
    );
  }

  return paths;
}

// Install native messaging manifest
export async function installNativeMessagingManifest(
  executablePath: string,
  extensionId: string
): Promise<void> {
  const manifestTemplatePath = path.join(
    __dirname,
    '../native-host/manifest-template.json'
  );
  const manifestTemplate = await fs.readFile(manifestTemplatePath, 'utf-8');

  const manifest = manifestTemplate
    .replace('{{EXECUTABLE_PATH}}', executablePath)
    .replace('{{EXTENSION_ID}}', `chrome-extension://${extensionId}/`);

  const paths = getNativeMessagingPaths();

  for (const hostPath of paths) {
    try {
      await fs.mkdir(hostPath, { recursive: true });
      const manifestPath = path.join(hostPath, 'com.atoss.cli.json');
      await fs.writeFile(manifestPath, manifest);
      console.log(`✓ Installed manifest to: ${manifestPath}`);
    } catch (error) {
      console.error(`Failed to install to ${hostPath}:`, error);
    }
  }
}
