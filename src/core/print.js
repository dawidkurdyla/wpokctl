export function printCreateSingle(taskId) {
    console.log(`Created task: ${taskId}`);
  }
  
  export function printCreateBatch(taskIds) {
    console.log(`Created ${taskIds.length} tasks:`);
    for (const id of taskIds) console.log(` - ${id}`);
  }
  
  export function exitForTaskResult(r) {
    if (r.state === 'DONE') {
      const code = typeof r.code === 'number' ? r.code : Number.NaN;
      console.log(`Exit code: ${code}`);
      if (Number.isFinite(code) && code !== 0) process.exitCode = 2;
      return;
    }
    if (r.state === 'TIMEOUT') {
      console.error('Timeout.');
      process.exitCode = 124;
      return;
    }
    process.exitCode = 1;
  }
  
  export function exitForManyResult(res) {
    if (res.state === 'DONE') {
      const bad = res.done.filter(x => x.code !== 0);
      if (bad.length) {
        console.error(`${bad.length} task(s) failed`);
        process.exitCode = 2;
      }
      return;
    }
    if (res.state === 'FAILED') {
      console.error('Fail-fast: some task failed.');
      process.exitCode = 2;
      return;
    }
    if (res.state === 'TIMEOUT') {
      console.error(`Timeout waiting; pending: ${res.pending.length}`);
      process.exitCode = 124;
      return;
    }
    console.error(`Partial result; pending: ${res.pending.length}`);
    process.exitCode = 1;
  }
  