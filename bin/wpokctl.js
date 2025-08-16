#!/usr/bin/env node
/**
 * wpokctl – CLI for the worker-pool platform
 */

import 'dotenv/config';
import { Command } from 'commander';
import tasks from '../src/commands/tasks.js';
import works from '../src/commands/works-watch.js';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

function getVersion() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const pkgPath   = join(__dirname, '..', 'package.json');
  const { version } = JSON.parse(readFileSync(pkgPath, 'utf8'));
  return version;
}

const program = new Command();
program
  .name('wpokctl')
  .description('CLI for the WPOK serverless worker-pool')
  .version(getVersion())
  .showHelpAfterError()
  .enablePositionalOptions();

program.addCommand(tasks);
program.addCommand(works);

program.parseAsync(process.argv);
