# ATOSS CLI

A command-line interface tool for ATOSS Staff Center time tracking system.

## Features

- **Fully automatic operation**: Just run commands, everything else happens automatically
- **Uses existing browser session**: No separate authentication needed
- **Auto-tab management**: Opens ATOSS tabs in background automatically
- **Instant responses**: Unix socket IPC provides <10ms CLI ↔ daemon latency
- **Browser extension integration**: Uses your existing Arc/Chrome ATOSS session

## Quick Start

### 1. Install and Build

```bash
npm install
npm run build
```

### 2. Setup Extension

```bash
npm start setup-extension
```

### 3. Load Extension in Browser

1. Open Arc (or Chrome/Edge)
2. Go to `arc://extensions` (or `chrome://extensions`)
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select `packages/extension/dist` from this project
6. Copy the Extension ID (32-character string)

### 4. Install Native Messaging Host

```bash
npm start install-host <YOUR_EXTENSION_ID>
```

**That's it!** The extension will automatically capture your ATOSS session when needed.

## Usage

### Get Time Tracking Data

```bash
# Get data for today
npm start get

# Get data for specific date (note the -- before flags)
npm start get -- -d 2024-12-24
npm start get -- --date 2024-12-24
```

### Set Time Tracking Data

```bash
# Set entries for a specific date (type defaults to "Presence")
npm start set -- -d 2024-12-31 -e 8:45,12:00 -e 12:30,17:30

# Set entries with explicit type
npm start set -- -d 2024-12-31 -e 8:45,12:00,wh -e 12:30,17:30,wh

# Set entries for today
npm start set -- -e 9:00,17:00
```

Each `-e` flag specifies one time entry with format: `start,end[,type]`
- `start`: Start time (HH:MM or H:MM, e.g., 8:45)
- `end`: End time (HH:MM or H:MM, e.g., 17:30)
- `type`: Entry type (optional, defaults to "Presence". e.g., "wh" for work hours)

**Safety**: The `set` command will fail if any entries already exist for the specified date, preventing accidental overwrites.

**Important**: When passing flags, use `--` before the flag:
- `npm start get -- -d 2024-12-24` ✓ Correct
- `npm start get -d 2024-12-24` ✗ Incorrect (npm consumes the flag)

The extension automatically:
1. Uses your browser's existing authenticated session
2. Opens an ATOSS tab in the background if not already open
3. Extracts or sets the requested data
4. Returns results instantly to the CLI

You don't need to open ATOSS manually or click anything in the browser!

## Project Structure

This is a monorepo using NPM workspaces with three packages:

- **`@atoss/cli`** - Command-line interface with Unix socket client
- **`@atoss/extension`** - Browser extension for automation and data extraction
- **`@atoss/shared`** - Shared TypeScript types

## Available Commands

### CLI Commands
| Command | Description |
|---------|-------------|
| `setup-extension` | Build and setup browser extension |
| `install-host <id>` | Install native messaging daemon for extension |
| `get [--date <date>]` | Get time tracking data for a specific date (YYYY-MM-DD) |
| `set --date <date> -e <start,end[,type]>` | Set time tracking entries for a specific date (type defaults to "Presence") |

### Build Commands
```bash
npm run build               # Build all packages
npm run build:cli           # Build only the CLI
npm run build:extension     # Build only the extension
npm run build:shared        # Build only shared types
npm run clean               # Clean all build outputs
```

## How It Works

```
CLI Tool  ←──→  Daemon  ←──→  Extension
         Unix Socket    Native Messaging
        (<10ms latency)  (stdio)
```

1. **CLI** sends requests via Unix socket to daemon
2. **Daemon** forwards requests to extension via native messaging
3. **Extension** automates ATOSS page and extracts data
4. **Daemon** sends response back to CLI via socket
5. **CLI** displays formatted output

## Troubleshooting

### Extension not communicating with CLI

1. Check extension is loaded: `arc://extensions`
2. Click "Inspect views: service worker" to check for errors
3. Verify native messaging manifest is installed:
   - Arc: `~/Library/Application Support/Arc/NativeMessagingHosts/com.atoss.cli.json`
   - Chrome: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.atoss.cli.json`
4. Check daemon logs: `cat ~/.atoss-cli/daemon.log`

### "Cannot connect to daemon" error

The daemon is automatically started by the extension when it loads. If you see this error:

1. Reload the extension in your browser
2. Wait a few seconds for daemon to start
3. Check `~/.atoss-cli/daemon.log` for errors

### Session expired errors

Make sure you're logged into ATOSS in your browser. The extension uses your browser's existing authenticated session.

### Daemon not starting

1. Check daemon logs: `cat ~/.atoss-cli/daemon.log`
2. Verify node is installed at: `/opt/homebrew/bin/node`
   - Or update `packages/cli/dist/native-host/daemon-launcher.sh` with correct path
3. Try reloading the extension

### Multiple browsers

**Recommendation**: Only load the extension in one browser at a time. Loading it in multiple browsers (Arc, Chrome, etc.) will launch multiple daemon instances.

## Supported Browsers

The extension works in any Chromium-based browser:
- **macOS**: Arc, Chrome, Edge, Chromium
- **Linux**: Chrome, Chromium
- **Windows**: Chrome, Edge

## File Locations

- **Daemon logs**: `~/.atoss-cli/daemon.log`
- **Unix socket**: `~/.atoss-cli/daemon.sock`

## Security

- Extension uses browser's existing authenticated session (no credentials stored)
- Unix socket limited to local machine communication
- Native messaging provides secure, OS-managed communication
- Microsoft SSO credentials remain in browser only (never extracted or stored)
- All communication happens locally (no network requests)
- Extension runs with minimal permissions (activeTab, nativeMessaging, scripting)

## Technical Details

See [CLAUDE.md](./CLAUDE.md) for technical documentation, architecture details, and development notes.

## License

MIT
