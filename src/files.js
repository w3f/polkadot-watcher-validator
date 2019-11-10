const fs = require('fs-extra')
const path = require('path')
const yaml = require('js-yaml')


module.exports = {
  readYAML: (filePath) => {
    const rawContent = fs.readFileSync(path.resolve(__dirname, filePath))

    return yaml.safeLoad(rawContent)
  }
}
