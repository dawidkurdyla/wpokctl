/**
 * wpokctl tasks watch <taskId> [--timeout <s>]
 */
import { Command } from 'commander';
import { TaskClient, waitForTask, extractWorkId } from '../core/client.js';
import { connEnv } from '../core/env.js';


const watchCmd = new Command('watch')
  .description('Watch a single task until it completes')
  .argument('<taskId>', 'Task ID')
  .option('--timeout <seconds>', 'Timeout (0 = wait forever)', '0')
  .action(async (taskId, opts) => {
    const timeoutSec = Number.parseInt(opts.timeout, 10) || 0;

    const workId = extractWorkId(taskId);
    const { redisURL, rabbitURL } = connEnv();
    const client = new TaskClient(workId, redisURL, rabbitURL);

    try {
      const r = await waitForTask(client, taskId, { timeoutSec });

      if (r.state === 'DONE') {
        console.log(`Exit code: ${r.code}`);
        if (typeof r.code === 'number' && r.code !== 0) process.exitCode = 2;
      } else if (r.state === 'TIMEOUT') {
        console.error('Timeout.');
        process.exitCode = 124;
      }
    } finally {
      await client.close();
    }
  });

export default watchCmd;
