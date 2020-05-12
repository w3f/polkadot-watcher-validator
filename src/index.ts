import process from 'process';
import program from 'commander';

import { startAction } from './actions/start';


program
  .command('start')
  .description('Starts the watcher.')
  .option('-c, --config [path]', 'Path to config file.', './config/main.yaml')
  .action(startAction);

program.allowUnknownOption(false);

program.parse(process.argv);
