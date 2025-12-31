#!/usr/bin/env node

import { Command } from 'commander';
import { get } from './commands/get';
import { setupExtension, installHost } from './commands/setup-extension';

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
