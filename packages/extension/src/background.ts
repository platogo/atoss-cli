// Background service worker for ATOSS CLI Helper extension
// Handles communication between content script and native daemon

// Type definitions inlined to avoid module syntax
interface TimeEntry {
  date: string;
  entries: { start?: string; end?: string; break?: string; total?: string; }[];
  rawData?: string;
}

type ExtensionMessage =
  | { type: 'dataResponse'; success: boolean; data?: TimeEntry; error?: string; }
  | { type: 'error'; message: string; };

interface TimeEntry {
  start: string;
  end: string;
  type: string;
}

type HostMessage =
  | { type: 'getData'; date: string; }
  | { type: 'setData'; date: string; entries: TimeEntry[]; };

const NATIVE_HOST_NAME = 'com.atoss.cli';

let nativePort: chrome.runtime.Port | null = null;

// Connect to native daemon on startup
function connectToDaemon() {
  console.log('Connecting to native daemon...');

  try {
    nativePort = chrome.runtime.connectNative(NATIVE_HOST_NAME);

    nativePort.onMessage.addListener((message: HostMessage) => {
      console.log('Received message from daemon:', message);
      handleDaemonMessage(message);
    });

    nativePort.onDisconnect.addListener(() => {
      console.log('Disconnected from native daemon');
      if (chrome.runtime.lastError) {
        console.error('Disconnect error:', chrome.runtime.lastError.message);
      }
      nativePort = null;

      // Try to reconnect after 5 seconds
      setTimeout(connectToDaemon, 5000);
    });

    console.log('Connected to native daemon');
  } catch (error) {
    console.error('Failed to connect to native daemon:', error);
    // Try again later
    setTimeout(connectToDaemon, 5000);
  }
}

// Find or create an ATOSS tab
async function getOrCreateAtossTab(): Promise<chrome.tabs.Tab> {
  // First, check if there's already an ATOSS tab open
  const existingTabs = await chrome.tabs.query({
    url: 'https://greentube.atoss.com/*'
  });

  if (existingTabs.length > 0) {
    // Use the first matching tab (could be inactive)
    return existingTabs[0];
  }

  // No ATOSS tab exists, create one
  console.log('No ATOSS tab found, creating new tab...');
  const newTab = await chrome.tabs.create({
    url: 'https://greentube.atoss.com/greentubeprod/html',
    active: false // Open in background
  });

  // Wait for the tab to finish loading
  await waitForTabLoad(newTab.id!);

  return newTab;
}

// Wait for a tab to finish loading
function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const listener = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);

    // Also check if tab is already loaded
    chrome.tabs.get(tabId, (tab) => {
      if (tab.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });
}

// Handle messages from daemon
async function handleDaemonMessage(message: HostMessage) {
  if (message.type === 'getData') {
    // Forward to content script
    try {
      // Get or create ATOSS tab (automatically opens if needed)
      const tab = await getOrCreateAtossTab();

      if (!tab.id) {
        sendToDaemon({
          type: 'dataResponse',
          success: false,
          error: 'Failed to get ATOSS tab ID'
        });
        return;
      }

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'extractData',
        date: message.date
      });

      if (response.success) {
        sendToDaemon({
          type: 'dataResponse',
          success: true,
          data: response.data
        });
      } else {
        sendToDaemon({
          type: 'dataResponse',
          success: false,
          error: response.error || 'Unknown error'
        });
      }
    } catch (error) {
      console.error('Error handling getData:', error);
      sendToDaemon({
        type: 'dataResponse',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else if (message.type === 'setData') {
    // Forward to content script
    try {
      // Get or create ATOSS tab (automatically opens if needed)
      const tab = await getOrCreateAtossTab();

      if (!tab.id) {
        sendToDaemon({
          type: 'dataResponse',
          success: false,
          error: 'Failed to get ATOSS tab ID'
        });
        return;
      }

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'setData',
        date: message.date,
        entries: message.entries
      });

      if (response.success) {
        sendToDaemon({
          type: 'dataResponse',
          success: true,
          data: response.data
        });
      } else {
        sendToDaemon({
          type: 'dataResponse',
          success: false,
          error: response.error || 'Unknown error'
        });
      }
    } catch (error) {
      console.error('Error handling setData:', error);
      sendToDaemon({
        type: 'dataResponse',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Send message to daemon
function sendToDaemon(message: ExtensionMessage) {
  if (nativePort) {
    nativePort.postMessage(message);
  } else {
    console.error('Cannot send message: not connected to daemon');
  }
}

// Start daemon connection on extension startup
connectToDaemon();
