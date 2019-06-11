const { filesystem } = require('gluegun')
const { trim } = require('lodash')
const { run } = require('../runner')

const VERSION = trim(
  filesystem.read('./package.json', 'json').version.toString()
)

describe('anoa version test', () => {
  test('anoa -v', async () => {
    const stdout = await run([`-v`], [], 200)
    expect(stdout).toEqual(VERSION)
  })

  test('anoa --v', async () => {
    const stdout = await run([`--v`], [], 200)
    expect(stdout).toEqual(VERSION)
  })

  test('anoa -version', async () => {
    const stdout = await run([`-version`], [], 200)
    expect(stdout).toEqual(VERSION)
  })

  test('anoa --version', async () => {
    const stdout = await run([`--version`], [], 200)
    expect(stdout).toEqual(VERSION)
  })

  test('anoa version', async () => {
    const stdout = await run([`version`], [], 200)
    expect(stdout).toEqual(VERSION)
  })
})
