/**
 * wpokctl works watch <workId> [--timeout <s>] [--idle <s>] [--json]
 * Snapshot semantics – observes the set of tasks belonging to a work.
 */
import { Command } from 'commander';
import { TaskClient, watchWork } from '../core/client.js';
import { connEnv } from '../core/env.js';


const watchCmd = new Command('watch')
  .description('Watch all tasks of a work until completion')
  .argument('<workId>', 'Work ID')
  .option('--timeout <seconds>', 'Global timeout (0 = none)', '0')
  .option('--idle <seconds>', 'Stop if no new completions within this period', '0')
  .option('--json', 'Stream JSON events (task:done / progress)', false)
  .action(async (workId, opts) => {
    const timeoutSec = Number.parseInt(opts.timeout, 10) || 0;
    const idleSec    = Number.parseInt(opts.idle, 10) || 0;

    const { redisURL, rabbitURL } = connEnv();
    const client = new TaskClient(workId, redisURL, rabbitURL);

    function onEvent(ev) {
      if (opts.json) {
        process.stdout.write(JSON.stringify(ev) + '\n');
      } else {
        if (ev.type === 'task:done') {
          console.log(`done: ${ev.taskId} (code=${ev.code})`);
        } else if (ev.type === 'progress') {
          process.stdout.write(`progress: ${ev.done}/${ev.total}\r`);
        }
      }
    }

    try {
      const res = await watchWork(client, workId, { timeoutSec, idleSec, onEvent });
      console.log(); // newline after progress
      if (res.state === 'DONE') {
        // Exit code summary
        const failed = res.results.filter(x => x.code !== 0);
        if (failed.length) {
          console.error(`Failed: ${failed.length}/${res.total}`);
          process.exitCode = 2;
        }
      } else if (res.state === 'IDLE') {
        console.error(`Idle timeout with ${res.results.length}/${res.total} done`);
        process.exitCode = 124;
      } else if (res.state === 'TIMEOUT') {
        console.error(`Global timeout with ${res.results.length}/${res.total} done`);
        process.exitCode = 124;
      }
    } finally {
      await client.close();
    }
  });

export default watchCmd;
