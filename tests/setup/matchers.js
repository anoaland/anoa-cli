const diff = require('jest-diff')
const { format } = require('prettier')
const { filesystem } = require('gluegun')

expect.extend({
  /**
   * Pretified source code matcher
   * @param {*} received received string
   * @param {string} expected expected source code
   * @param {typescript | javascript | json} parser parser type
   */
  prettySame(received, expected, parser) {
    return prettySame(received, expected, parser)
  },

  /**
   * Ensure path is exsist and prettified contents is match
   * @param {file path} received file path
   * @param {string} expected expected contents
   * @param {typescript | javascript | json} parser parser type
   */
  existsAndPrettySame(received, expected, parser) {
    const { exists, read } = filesystem
    if (!exists(received)) {
      return {
        pass: false,
        message: () => `${received} is not exists`
      }
    }

    received = read(received)

    return prettySame(received, expected, parser)
  },

  isExists(received) {
    const { exists } = filesystem
    if (!exists(received)) {
      return {
        pass: false,
        message: () => `${received} is not exists`
      }
    }
    return {
      pass: true
    }
  }
})

function prettySame(received, expected, parser) {
  const opt = {
    semi: false,
    singleQuote: true,
    parser: parser || 'typescript'
  }

  received = format(received, opt)
  expected = format(expected, opt)

  // commented code sometimes is annoying
  const pass = received.replace(/\s+/gm, ` `) === expected.replace(/\s+/gm, ` `)
  const message = pass ? () => '' : () => diff(expected, received)

  return {
    message,
    pass
  }
}
