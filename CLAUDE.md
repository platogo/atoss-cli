# ATOSS CLI - Technical Documentation

## Overview
Command-line interface tool for ATOSS Staff Center time tracking system at `https://greentube.atoss.com/greentubeprod/html`.

**Key Features:**
- Fully automatic operation - no manual browser interaction required
- Uses existing browser session - no separate authentication needed
- Automatic tab management - extension opens ATOSS tabs in background
- Uses existing Microsoft SSO session from Arc/Chrome browser
- Persistent daemon with Unix socket IPC for instant CLI communication
- No Puppeteer - all automation handled by lightweight browser extension

## Architecture

### Three-Component System

**1. CLI Tool** (`packages/cli/`)
- Commander.js-based CLI with commands: `get`, `set`, `setup-extension`, `install-host`
- Connects to daemon via Unix domain socket (`~/.atoss-cli/daemon.sock`)
- Sends requests as newline-delimited JSON
- Receives instant responses (<10ms latency)

**2. Daemon** (`packages/cli/src/native-host/daemon.ts`)
- Persistent Node.js process launched automatically by browser extension
- Dual communication channels:
  - **CLI ↔ Daemon**: Unix domain socket (instant, event-driven)
  - **Daemon ↔ Extension**: Native messaging Port (stdio with 4-byte length prefix)
- Message forwarding bridge between CLI and extension
- Logs all activity to `~/.atoss-cli/daemon.log`

**3. Browser Extension** (`packages/extension/`)
- Chrome Extension Manifest V3
- **Background Service Worker**: Connects to daemon, manages tabs automatically
- **Content Script**: Automates ATOSS page (clicks, navigation, data extraction)
- **Injected Script**: Runs in page context to access ZK framework (window.zk)

## Communication Flow

### Get Command Flow
```
User: npm start get -- -d 2024-12-24
       ↓
CLI → daemon.sock → getData request
       ↓
Daemon → Extension (native messaging)
       ↓
Extension finds/creates ATOSS tab in background
       ↓
Content script opens modal, navigates datepicker
       ↓
Content script extracts time entries
       ↓
Extension → Daemon → CLI via socket
       ↓
CLI displays formatted output
```

### Set Command Flow
```
User: npm start set -- -d 2024-12-31 -e 8:45,12:00 -e 12:30,17:30
       ↓
CLI → daemon.sock → setData request with entries (type defaults to "Presence")
       ↓
Daemon → Extension (native messaging)
       ↓
Extension finds/creates ATOSS tab in background
       ↓
Content script opens modal, navigates datepicker
       ↓
Content script verifies no existing entries (safety check)
       ↓
For each entry: Click Add, fill form via ZK widgets, click Confirm
       ↓
Extension → Daemon → CLI via socket
       ↓
CLI displays success confirmation
```

**Key Points:**
- Extension uses browser's existing authenticated session
- No separate login or cookie management needed
- Everything happens automatically in background
- Set command validates no existing entries before writing

## Features

### 1. Get Command
- Retrieves time tracking data for specified date
- Usage: `npm start get -- -d YYYY-MM-DD` (defaults to today)
- Uses browser's existing authenticated session
- Automatically opens ATOSS tab in background
- Returns structured time entry data (start, end, type)

### 2. Set Command
- Writes time tracking entries for a specified date
- Usage: `npm start set -- -d YYYY-MM-DD -e start,end[,type] [-e ...]`
- Each `-e` flag specifies one entry: `start,end[,type]` (e.g., `8:45,12:00` or `8:45,12:00,wh`)
- Type parameter is optional and defaults to "Presence"
- Safety validation: Fails if any entries already exist for the date
- Automates form filling via ZK widget API (time inputs, type selector)
- Supports multiple entries in a single command
- Examples:
  - `npm start set -- -d 2024-12-31 -e 8:45,12:00 -e 12:30,17:30`
  - `npm start set -- -d 2024-12-31 -e 8:45,12:00,wh -e 12:30,17:30,wh`

### 3. Extension Setup
- `npm start setup-extension` - Builds extension, shows load instructions
- `npm start install-host <ID>` - Installs native messaging manifest for extension ID
- Supports multiple browsers: Arc, Chrome, Edge, Chromium

### 4. ZK Framework Integration
ATOSS uses ZK framework (https://www.zkoss.org/) for UI components. Content scripts cannot access `window.zk` due to isolation.

**Solution**: Inject script into page context
- `packages/extension/public/inject.js` runs in page context
- Has access to `window.zk` global object
- Communicates with content script via custom DOM events
- Navigates datepicker: `widget.setValue(dateObj)` + `widget.fire('onChange')`

**Example**:
```javascript
// Parse YYYY-MM-DD to Date object
const parts = dateString.split('-');
const dateObj = new Date(
  parseInt(parts[0], 10),      // year
  parseInt(parts[1], 10) - 1,  // month (0-indexed)
  parseInt(parts[2], 10)       // day
);

// Update ZK widget
const widget = window.zk.Widget.$(datepickerInput);
widget.setValue(dateObj);
widget.fire('onChange', { value: dateObj });  // Triggers data load
```

### 5. Data Extraction and Form Filling

**Data Extraction (Get Command)**:
- Extracts from `div.time-point-wrapper` and `div.time-interval-wrapper`
- **Filters out break/absence entries**: Entries with type containing "break" or "absence" (case-insensitive) are excluded from results
  - Example: Entry with type `"Break/absence"` is filtered out
  - This applies to both `get` command (reading data) and result validation
- Returns structured `TimeEntry[]` with start, end, type
- Handles empty days gracefully (returns `[]`)

**Form Filling (Set Command)**:
- Sets time inputs using ZK widget API: `widget.setValue(minutes)`
- Sets type selector using ZK widget API: `widget.fire('onChanging', { value })`
- Time conversion: Converts `HH:MM` format to minutes (e.g., `8:45` → 525 minutes)
- Type selection: Fills search input and clicks matching suggestion/result item
- Form automation: Clicks "Add" button, fills form fields, clicks "Confirm"
- Validates no existing entries before writing (safety check)

## Technical Stack

- **Language**: TypeScript 5.3.3
- **CLI Framework**: Commander 11.1.0
- **Extension**: Chrome Extension Manifest V3
- **IPC**: Unix domain sockets (CLI ↔ Daemon), Native Messaging (Daemon ↔ Extension)
- **Build System**: TypeScript compiler, NPM Workspaces
- **Monorepo**: 3 packages (`@atoss/cli`, `@atoss/extension`, `@atoss/shared`)

## Project Structure

```
atoss-cli/
├── package.json                      # Workspace root (private)
├── packages/
│   ├── cli/                          # @atoss/cli
│   │   ├── src/
│   │   │   ├── index.ts              # CLI entry point
│   │   │   ├── commands/
│   │   │   │   ├── get.ts            # Data retrieval via socket
│   │   │   │   ├── set.ts            # Data writing via socket
│   │   │   │   └── setup-extension.ts
│   │   │   ├── native-host/
│   │   │   │   ├── daemon.ts         # Unix socket server + native messaging
│   │   │   │   └── manifest-template.json
│   │   │   └── utils/
│   │   │       └── extension.ts      # Native messaging utilities
│   │   └── dist/                     # Compiled output
│   │
│   ├── extension/                    # @atoss/extension
│   │   ├── src/
│   │   │   ├── background.ts         # Service worker
│   │   │   └── content.ts            # Content script
│   │   ├── public/
│   │   │   ├── manifest.json
│   │   │   ├── inject.js             # Page context script
│   │   │   └── icons/
│   │   └── dist/
│   │
│   └── shared/                       # @atoss/shared
│       ├── types.ts                  # Shared TypeScript types
│       └── dist/
│
├── README.md
└── CLAUDE.md
```

## Build Process

**NPM Workspaces** - single install, shared dependencies:

```bash
npm install           # Installs all package dependencies
npm run build         # Builds all packages in dependency order
npm run build:cli     # Build CLI only
npm run build:extension  # Build extension only
npm run clean         # Clean all dist/ directories
```

**CLI Build**:
- Compiles TypeScript to `packages/cli/dist/`
- Creates `daemon-launcher.sh` wrapper with absolute node path (`/opt/homebrew/bin/node`)
- Copies native messaging manifest template

**Extension Build**:
- Compiles TypeScript with `module: "None"` to avoid ES module syntax
- Automated sed script removes `export {};` statements
- Copies `public/` files (manifest, icons, inject.js) to `dist/`

## Setup & Usage

### One-time Setup
```bash
npm install
npm run build
npm start setup-extension

# Load extension in Arc/Chrome (arc://extensions)
# Enable Developer mode → Load unpacked → select packages/extension/dist
# Copy extension ID

npm start install-host <EXTENSION_ID>
```

### Daily Usage
```bash
# Get today's data
npm start get

# Get specific date (note the -- before flags)
npm start get -- -d 2024-12-24

# Set entries for a specific date (type defaults to "Presence")
npm start set -- -d 2024-12-31 -e 8:45,12:00 -e 12:30,17:30

# Set entries with explicit type
npm start set -- -d 2024-12-31 -e 8:45,12:00,wh -e 12:30,17:30,wh

# Set entries for today
npm start set -- -e 9:00,17:00
```

**Important**: Use `--` to pass flags through npm scripts:
- `npm start get -- -d 2025-12-01` ✓ Correct
- `npm start get -d 2025-12-01` ✗ Incorrect (npm consumes `-d`)

**Note**: The extension uses your browser's existing authenticated session - no separate login or cookie management needed.

## Security

- Native messaging provides secure, OS-managed communication between extension and daemon
- Extension uses browser's existing authenticated session (no credentials stored)
- Microsoft SSO credentials remain in browser only (never extracted or stored)
- Daemon only accepts connections from registered extension ID
- Unix socket limited to local machine communication
- All communication happens locally (no network requests)
- Extension runs with minimal permissions (activeTab, nativeMessaging, scripting)

## Development Notes

### Website Structure Rules
**CRITICAL**: Never guess or assume website structure, HTML classes, button text, or DOM elements.

**Rules**:
1. **Always ask for HTML examples** if you're unsure about:
   - Element classes or IDs
   - Button text or labels
   - DOM structure
   - Any selector patterns
2. **Only use what was provided** in HTML examples
   - ✗ Bad: Assuming "OK" button exists without seeing it in HTML
   - ✗ Bad: Guessing class names like "btn-primary" without evidence
   - ✓ Good: Using only classes/text shown in provided HTML
3. **Never add alternatives** unless explicitly shown in examples
   - If you see "Confirm" in HTML, only match "Confirm"
   - Don't add "OK", "Submit", or other variations

### Extension Error Handling
Extension errors appear in `chrome://extensions` and can alarm users.

**Rules**:
1. Only throw errors for bugs/exceptional conditions
   - ✓ Good: Missing modal when expected (indicates bug)
   - ✗ Bad: No time entries on a day (normal scenario, return `[]`)
2. Return empty/default values for normal scenarios
3. Add context to real errors: `console.error('Timeline div not found - page structure changed')`
4. Use `console.warn()` for non-critical issues

### Build Details
- **daemon-launcher.sh**: Wrapper with absolute node path to fix PATH issues when browsers launch daemon
- **sed script**: Removes TypeScript `export {};` statements that break extension
- **module: "None"**: TypeScript config avoids ES module syntax in extension output

## Design Decisions

### Why Native Messaging Daemon?
- ✓ More secure than HTTP server (no port exposure)
- ✓ OS-managed communication pipe
- ✓ Standard for extensions (1Password, Bitwarden use this)
- ✓ Bidirectional communication built-in
- ✓ No port conflicts

### Why Unix Sockets for CLI ↔ Daemon?
- ✓ Instant communication (<10ms latency)
- ✓ Event-driven, no polling overhead
- ✓ Standard IPC for local processes
- ✓ Cross-platform (Node.js `net` module)
- ✓ Cleaner than filesystem polling

### Why Persistent Daemon?
- ✓ Enables bidirectional CLI ↔ Extension communication
- ✓ Extension can maintain state
- ✓ No process startup overhead
- ✗ Need to manage process lifecycle

### Why No Puppeteer?
- ✓ Saves ~300-400MB installation size
- ✓ Faster execution (no browser launch)
- ✓ Extension already has DOM access
- ✓ Simpler codebase
- ✗ Requires extension to be installed

### Why NPM Workspaces?
- ✓ Single `npm install` for entire monorepo
- ✓ Shared dependencies hoisted
- ✓ Easy cross-package references (`@atoss/shared`)
- ✓ Better IDE support

## Current Limitations

### Extension Icons
- Minimal 1x1 transparent PNG placeholders
- Extension icon appears blank/invisible
- TODO: Create proper 16x16, 48x48, 128x128 icons

### Multi-Browser Installation
- `install-host` installs manifest to ALL browsers (Arc, Chrome, Edge, Chromium)
- If extension loaded in multiple browsers, all launch separate daemons
- Recommendation: Load extension in one browser only

### Daemon Reliability
- Extension auto-starts daemon when it connects
- If daemon crashes, CLI commands fail until extension reconnects
- Extension auto-reconnects after 5 seconds
- Check `~/.atoss-cli/daemon.log` for errors

## Dependencies

**Workspace Root**:
- `typescript@5.3.3`

**@atoss/cli**:
- `commander@11.1.0` - CLI framework
- `@atoss/shared` - Shared types (workspace reference)
- `@types/node` (dev)

**@atoss/extension**:
- `@atoss/shared` - Shared types (workspace reference)
- `@types/chrome` (dev)

**@atoss/shared**:
- No runtime dependencies
- `typescript@5.3.3` (dev)

## Platform Support

- **Developed on**: macOS (Darwin 25.1.0)
- **Tested with**: Arc browser (Chromium-based)
- **Should work on**: Chrome, Edge, Chromium on macOS/Linux/Windows
- **Native messaging paths**: Verified for macOS Arc/Chrome/Edge
