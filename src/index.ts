import process from 'process';
import program from 'commander';
import { startAction } from './actions/start';
import '@polkadot/api-augment'; //https://github.com/polkadot-js/api/issues/4450


program
  .command('start')
  .description('Starts the watcher.')
  .option('-c, --config [path]', 'Path to config file.', './config/main.yaml')
  .action(startAction);

program.allowUnknownOption(false);

program.parse(process.argv);
