const path = require('path')
const process = require('process')

const files = require('./files')


class Config {
  static parse(rawCfgPath) {
    const cfgPath = path.resolve(process.cwd(), rawCfgPath)
    return files.readYAML(cfgPath)
  }
}

module.exports = {
  Config
}
