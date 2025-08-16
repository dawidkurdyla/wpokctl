import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import yaml from 'js-yaml';
import { assertValidManifest } from './client.js';

export async function loadManifest(filePath) {
  const raw = await readFile(filePath, 'utf8');
  const data =
    extname(filePath).toLowerCase() === '.json' ? JSON.parse(raw) : yaml.load(raw);
    
  return data;
}

export async function loadAndValidateManifest(filePath) {
  const m = await loadManifest(filePath);
  assertValidManifest(m);

  return m;
}
