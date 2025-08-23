import { Command } from 'commander';
import watchCmd  from './work-watch.js';

const work = new Command('work')
  .description('Work/batch operations');

work.addCommand(watchCmd);

export default work;
