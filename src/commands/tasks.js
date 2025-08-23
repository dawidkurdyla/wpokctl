import { Command } from 'commander';
import createCmd from './tasks-create.js';
import watchCmd from './tasks-watch.js';

const tasks = new Command('tasks')
  .description('Task operations');

tasks.addCommand(createCmd);
tasks.addCommand(watchCmd);

export default tasks;
