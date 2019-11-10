#!/usr/bin/env node

const process = require('process')
const program = require('commander')

const start = require('./actions/start')


program
  .command('start')
  .description('Starts the watcher.')
  .option('-c, --config [path]', 'Path to config file.', './config/main.yaml')
  .action(start.do)

program.allowUnknownOption(false)

program.parse(process.argv)
