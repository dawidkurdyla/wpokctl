import { Command } from 'commander';
import { loadAndValidateManifest } from '../core/manifest.js';
import { connEnv } from '../core/env.js';
import { TaskClient, createSingle, createBatch, waitForTask, waitForMany } from '../core/client.js';

const createCmd = new Command('create')
  .alias('c')
  .description('Create a task (or tasks in batch) from a manifest')
  .requiredOption('-f, --file <path>', 'YAML/JSON manifest')
  .option('--batch', 'Create tasks in batch mode', false)
  .option('--wait', 'Wait for completion', false)
  .option('--timeout <seconds>', 'Timeout for waiting (0 = no timeout)', '0')
  .option('--fail-fast', 'Batch: stop on first non-zero code', false)
  .action(async (opts) => {
    const timeoutSec = Number.parseInt(opts.timeout, 10) || 0;

    let manifest;
    try {
      manifest = await loadAndValidateManifest(opts.file);
    } catch (e) {
      console.error(e.message);
      if (e.details) {
        for (const err of e.details) {
          console.error(`  • ${(err.instancePath || '(root)')} ${err.message}`);
        }
      }
      process.exitCode = 1;
      return;
    }

    const workId = manifest?.metadata?.workId;
    const { redisURL, rabbitURL } = connEnv();
    const client = new TaskClient(workId, redisURL, rabbitURL);

    try {
      if (!opts.batch) {
        const taskId = await createSingle(client, manifest);
        console.log(`Created task: ${taskId}`);
        if (!opts.wait) return;

        const res = await waitForTask(client, taskId, { timeoutSec });
        if (res.state === 'DONE') {
          console.log(`Exit code: ${res.code}`);
          if (typeof res.code === 'number' && res.code !== 0) process.exitCode = 2;
        } else {
          console.error('Timeout.');
          process.exitCode = 124;
        }
        return;
      }

      const taskIds = await createBatch(client, manifest);
      console.log(`Created ${taskIds.length} tasks.`);
      if (!opts.wait) return;

      const res = await waitForMany(client, taskIds, { timeoutSec, failFast: opts.failFast });
      const failed = res.done.filter(x => x.code !== 0);
      console.log(`Done: ${res.done.length}/${taskIds.length}`);
      if (failed.length) {
        console.log(`Failed: ${failed.length}`);
        process.exitCode = 2;
      }
      if (res.state === 'TIMEOUT') {
        console.error(`Timeout; pending: ${res.pending.length}`);
        process.exitCode = 124;
      }
    } finally {
      await client.close();
    }
  });

export default createCmd;
