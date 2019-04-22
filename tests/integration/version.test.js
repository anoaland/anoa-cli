const { filesystem } = require('gluegun')
const { trim } = require('lodash')
const utils = require('../utils')
const path = require('path')

const ANOA = path.join(process.cwd(), 'bin', 'anoa')
const VERSION = trim(filesystem.read('./package.json', 'json').version)

describe('anoa version test', () => {
  test('anoa -v', async () => {
    const stdout = await utils.exec(`${ANOA} -v`)
    expect(stdout).toBe(VERSION)
  })

  test('anoa --v', async () => {
    const stdout = await utils.exec(`${ANOA} --v`)
    expect(stdout).toBe(VERSION)
  })

  test('anoa -version', async () => {
    const stdout = await utils.exec(`${ANOA} -version`)
    expect(stdout).toBe(VERSION)
  })

  test('anoa --version', async () => {
    const stdout = await utils.exec(`${ANOA} --version`)
    expect(stdout).toBe(VERSION)
  })

  test('anoa version', async () => {
    const stdout = await utils.exec(`${ANOA} version`)
    expect(stdout).toBe(VERSION)
  })
})
