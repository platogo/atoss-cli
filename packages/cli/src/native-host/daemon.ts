#!/usr/bin/env node

// Persistent native messaging daemon for ATOSS CLI
// Bridges between CLI (via Unix socket) and Extension (via native messaging)

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as net from 'net';
import type { ExtensionMessage, HostMessage } from '@atoss/shared';

const REQUEST_DIR = path.join(os.homedir(), '.atoss-cli');
const LOG_FILE = path.join(REQUEST_DIR, 'daemon.log');
const SOCKET_PATH = path.join(REQUEST_DIR, 'daemon.sock');

let extensionPort: any = null; // Port connection to extension
let cliClients = new Set<net.Socket>(); // Connected CLI clients

// Log to file for debugging
function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp}: ${message}\n`;

  // Also write to stderr
  console.error(message);

  // Write to log file
  try {
    require('fs').appendFileSync(LOG_FILE, logMessage);
  } catch (error) {
    // Ignore file write errors
  }
}

// Read message from extension (stdin with length prefix)
async function readExtensionMessage(): Promise<ExtensionMessage | null> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const lengthBuffer = Buffer.alloc(4);
    let lengthBytesRead = 0;
    let messageLength = 0;
    let messageBuffer: Buffer | null = null;

    const handleData = () => {
      try {
        let chunk: Buffer | null;

        // First, read the 4-byte length prefix
        while (lengthBytesRead < 4) {
          chunk = stdin.read(4 - lengthBytesRead);
          if (!chunk) return; // Not enough data yet, wait for more

          chunk.copy(lengthBuffer, lengthBytesRead);
          lengthBytesRead += chunk.length;

          if (lengthBytesRead === 4) {
            messageLength = lengthBuffer.readUInt32LE(0);

            if (messageLength > 10485760) { // 10MB sanity check
              log(`ERROR: Message length too large: ${messageLength}`);
              stdin.removeListener('readable', handleData);
              stdin.removeListener('end', handleEnd);
              resolve(null);
              return;
            }

            messageBuffer = Buffer.alloc(messageLength);
          }
        }

        // Then, read the message body
        if (messageBuffer && messageLength > 0) {
          let messageBytesRead = 0;
          while (messageBytesRead < messageLength) {
            chunk = stdin.read(messageLength - messageBytesRead);
            if (!chunk) return; // Not enough data yet, wait for more

            chunk.copy(messageBuffer, messageBytesRead);
            messageBytesRead += chunk.length;

            if (messageBytesRead === messageLength) {
              // Complete message received
              const messageText = messageBuffer.toString('utf-8');
              try {
                const message = JSON.parse(messageText) as ExtensionMessage;
                stdin.removeListener('readable', handleData);
                stdin.removeListener('end', handleEnd);
                resolve(message);
              } catch (error) {
                log(`Error parsing message: ${error}`);
                stdin.removeListener('readable', handleData);
                stdin.removeListener('end', handleEnd);
                resolve(null);
              }
            }
          }
        }
      } catch (error) {
        log(`Exception in handleData: ${error}`);
        stdin.removeListener('readable', handleData);
        stdin.removeListener('end', handleEnd);
        resolve(null);
      }
    };

    const handleEnd = () => {
      log('stdin END event received - connection closed by extension');
      stdin.removeListener('readable', handleData);
      stdin.removeListener('end', handleEnd);
      resolve(null);
    };

    stdin.on('readable', handleData);
    stdin.on('end', handleEnd);
  });
}

// Send message to extension (stdout with length prefix)
function sendExtensionMessage(message: HostMessage): void {
  const messageText = JSON.stringify(message);
  const messageBuffer = Buffer.from(messageText, 'utf-8');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32LE(messageBuffer.length, 0);

  process.stdout.write(lengthBuffer);
  process.stdout.write(messageBuffer);
}

// Create Unix socket server for CLI connections
function createSocketServer(): net.Server {
  const server = net.createServer((socket) => {
    log('CLI client connected');
    cliClients.add(socket);

    let buffer = '';

    socket.on('data', (data) => {
      buffer += data.toString();

      // Try to parse complete JSON messages (newline-delimited)
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const request = JSON.parse(line);
          log(`Received request from CLI: ${request.type}`);

          // Send to extension
          if (request.type === 'getData') {
            sendExtensionMessage({
              type: 'getData',
              date: request.date
            });
          }
        } catch (error) {
          log(`Error parsing CLI request: ${error}`);
          socket.write(JSON.stringify({
            success: false,
            error: 'Invalid JSON request'
          }) + '\n');
        }
      }
    });

    socket.on('error', (error) => {
      log(`Socket error: ${error}`);
      cliClients.delete(socket);
    });

    socket.on('close', () => {
      log('CLI client disconnected');
      cliClients.delete(socket);
    });
  });

  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      log(`Socket already in use at ${SOCKET_PATH}, cleaning up and retrying...`);
      // Try to remove stale socket file
      try {
        require('fs').unlinkSync(SOCKET_PATH);
        server.listen(SOCKET_PATH);
      } catch (e) {
        log(`Failed to clean up socket: ${e}`);
      }
    } else {
      log(`Socket server error: ${error}`);
    }
  });

  return server;
}

// Send message to all connected CLI clients
function sendToCliClients(message: any): void {
  const messageStr = JSON.stringify(message) + '\n';
  for (const client of cliClients) {
    try {
      client.write(messageStr);
    } catch (error) {
      log(`Error sending to CLI client: ${error}`);
      cliClients.delete(client);
    }
  }
}

// Handle messages from extension
async function handleExtensionMessage(message: ExtensionMessage): Promise<void> {
  log(`Received message from extension: ${message.type}`);

  if (message.type === 'dataResponse') {
    // Send response to CLI clients via socket
    log('Sending data response to CLI clients');
    sendToCliClients(message);
  } else if (message.type === 'error') {
    // Send error response to CLI clients
    log(`Sending error to CLI clients: ${message.message}`);
    sendToCliClients({
      success: false,
      error: message.message
    });
  }
}

async function main() {
  try {
    log('Daemon started');

    // Keep process alive
    process.stdin.resume();

    // Ensure request directory exists
    try {
      await fs.mkdir(REQUEST_DIR, { recursive: true });
    } catch (error) {
      log(`Error creating request directory: ${error}`);
    }

    // Clean up stale socket file if it exists
    try {
      await fs.unlink(SOCKET_PATH);
      log('Removed stale socket file');
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        log(`Warning: Could not remove socket file: ${error}`);
      }
    }

    // Start Unix socket server for CLI connections
    const socketServer = createSocketServer();
    socketServer.listen(SOCKET_PATH, () => {
      log(`Socket server listening at ${SOCKET_PATH}`);
    });

    // Clean up socket on exit
    const cleanup = async () => {
      log('Cleaning up...');
      socketServer.close();
      try {
        await fs.unlink(SOCKET_PATH);
      } catch (error) {
        // Ignore
      }
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Listen for messages from extension
    while (true) {
      try {
        const message = await readExtensionMessage();

        if (!message) {
          log('Connection closed');
          break;
        }

        await handleExtensionMessage(message);
      } catch (error) {
        log(`Error in message loop: ${error}`);
        break;
      }
    }

    await cleanup();
  } catch (error) {
    log(`Fatal error: ${error}`);
    process.exit(1);
  }
}

main().catch((error) => {
  log(`Fatal error in daemon: ${error}`);
  process.exit(1);
});
