#!/usr/bin/env node

import { Command } from 'commander';
import { get } from './commands/get';
import { set } from './commands/set';
import { setupExtension, installHost } from './commands/setup-extension';
import type { TimeEntry } from '@atoss/shared';

const program = new Command();

program
  .name('atoss-cli')
  .description('CLI tool for ATOSS Staff Center time tracking')
  .version('1.0.0');

program
  .command('get')
  .description('Get time tracking data for a specific date')
  .option('-d, --date <date>', 'Date in YYYY-MM-DD format (defaults to today)')
  .action(async (options) => {
    try {
      await get(options.date);
    } catch (error) {
      console.error('Get failed:', error);
      process.exit(1);
    }
  });

program
  .command('set')
  .description('Set time tracking data for a specific date')
  .option('-d, --date <date>', 'Date in YYYY-MM-DD format (defaults to today)')
  .option('-e, --entry <start,end[,type]>', 'Time entry in format: start,end[,type] (e.g., 8:45,12:00 or 8:45,12:00,wh). Type defaults to "Presence". Can be specified multiple times.', (value: string, previous: TimeEntry[] = []): TimeEntry[] => {
    const parts = value.split(',');
    if (parts.length !== 2 && parts.length !== 3) {
      console.error(`Error: Invalid entry format: ${value}`);
      console.error('Expected format: start,end[,type] (e.g., 8:45,12:00 or 8:45,12:00,wh)');
      process.exit(1);
    }
    const start = parts[0];
    const end = parts[1];
    const type = parts[2] || 'Presence';  // Default to "Presence" if not provided
    previous.push({ start, end, type });
    return previous;
  })
  .action(async (options) => {
    try {
      const entries = options.entry || [];
      if (entries.length === 0) {
        console.error('Error: No entries provided. Use -e to specify entries.');
        console.error('Example: set -d 2025-12-02 -e 8:45,12:00 -e 12:30,17:30');
        console.error('         set -d 2025-12-02 -e 8:45,12:00,wh -e 12:30,17:30,wh');
        process.exit(1);
      }
      await set(options.date, entries);
    } catch (error) {
      console.error('Set failed:', error);
      process.exit(1);
    }
  });

program
  .command('setup-extension')
  .description('Build and setup the browser extension')
  .action(async () => {
    try {
      await setupExtension();
    } catch (error) {
      console.error('Setup failed:', error);
      process.exit(1);
    }
  });

program
  .command('install-host <extensionId>')
  .description('Install native messaging host for the extension')
  .action(async (extensionId: string) => {
    try {
      await installHost(extensionId);
    } catch (error) {
      console.error('Install failed:', error);
      process.exit(1);
    }
  });

program.parse();
