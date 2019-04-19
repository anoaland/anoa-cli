const g = require('gluegun')

module.exports = ({ hasYarn, confirm } = {}) => {
  // suppress all messages
  g.print.warning = jest.fn()
  g.info = jest.fn()
  g.warning = jest.fn()
  g.success = jest.fn()
  g.error = jest.fn()
  g.debug = jest.fn()
  g.fancy = jest.fn()
  g.divider = jest.fn()
  g.findWidths = jest.fn()
  g.columnHeaderDivider = jest.fn()
  g.newline = jest.fn()
  g.table = jest.fn()
  g.spin = jest.fn()
  g.printCommands = jest.fn()
  g.printHelp = jest.fn()

  // mock prompt
  g.prompt.ask = async param => {
    if (typeof confirm !== 'undefined') {
      if (param.type === 'confirm') {
        return { [param.name]: confirm }
      }
    }
  }

  // mock run
  g.system.run = cmd => {
    if (typeof hasYarn !== 'undefined') {
      if (cmd === 'yarn -v') {
        return hasYarn
      }
      throw 'invalid command'
    }
  }

  return g
}
