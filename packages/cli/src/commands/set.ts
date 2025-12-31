import * as path from 'path';
import * as os from 'os';
import * as net from 'net';
import type { TimeEntry } from '@atoss/shared';

const REQUEST_DIR = path.join(os.homedir(), '.atoss-cli');
const SOCKET_PATH = path.join(REQUEST_DIR, 'daemon.sock');

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(dateString: string): Date {
  const parts = dateString.split('-');
  if (parts.length !== 3) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }

  return new Date(year, month, day);
}

async function sendRequestToSocket(request: any, timeoutMs: number = 30000): Promise<any> {
  return new Promise((resolve, reject) => {
    const client = net.connect(SOCKET_PATH);
    let buffer = '';
    let timeoutHandle: NodeJS.Timeout;

    timeoutHandle = setTimeout(() => {
      client.destroy();
      reject(new Error('Timeout waiting for response from daemon. Make sure the extension is installed and daemon is running.'));
    }, timeoutMs);

    client.on('connect', () => {
      // Send request as newline-delimited JSON
      client.write(JSON.stringify(request) + '\n');
    });

    client.on('data', (data) => {
      buffer += data.toString();

      // Try to parse complete JSON messages (newline-delimited)
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const response = JSON.parse(line);
          clearTimeout(timeoutHandle);
          client.end();
          resolve(response);
          return;
        } catch (error) {
          // Incomplete JSON, continue buffering
        }
      }
    });

    client.on('error', (error: any) => {
      clearTimeout(timeoutHandle);
      if (error.code === 'ENOENT' || error.code === 'ECONNREFUSED') {
        reject(new Error('Cannot connect to daemon. Make sure the browser extension is installed and loaded.'));
      } else {
        reject(new Error(`Socket error: ${error.message}`));
      }
    });

    client.on('close', () => {
      clearTimeout(timeoutHandle);
      if (buffer.trim()) {
        // Connection closed with incomplete data
        reject(new Error('Connection closed unexpectedly'));
      }
    });
  });
}

export async function set(dateString?: string, entries?: TimeEntry[]): Promise<void> {
  const targetDate = dateString ? parseDate(dateString) : new Date();
  const formattedDate = formatDate(targetDate);

  if (!entries || entries.length === 0) {
    console.error('Error: No time entries provided');
    process.exit(1);
  }

  console.log(`Setting time tracking data for ${formattedDate}...`);

  try {
    // Send request via socket
    const request = {
      type: 'setData',
      date: formattedDate,
      entries: entries,
      timestamp: Date.now()
    };

    console.log('Request sent to daemon...');
    console.log('(The extension will automatically open an ATOSS tab if needed)');

    // Wait for response via socket
    const response = await sendRequestToSocket(request);

    if (!response.success) {
      throw new Error(response.error || 'Failed to set data');
    }

    // Display results
    console.log('\n✓ Time tracking data set successfully:');
    console.log(`Date: ${formattedDate}`);
    console.log(`Entries set: ${entries.length}`);

  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('Error:', error);
    }
    process.exit(1);
  }
}
