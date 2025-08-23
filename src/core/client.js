/**
 * Factory to access the CJS client-lib from ESM CLI.
 * Supports package name or an override path via WPOK_CLIENT_LIB.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const libModule = process.env.WPOK_CLIENT_LIB || '@wpok/client-lib';
const lib = require(libModule);

// Re-export what CLI needs
export const {
  TaskClient,
  createSingle,
  createBatch,
  planBatch,
  waitForTask,
  waitForMany,
  watchWork,
  parseS3Url,
  generateWorkId,
  generateTaskId,
  extractWorkId,
  validateManifest,
  assertValidManifest
} = lib;
