const tempy = require('tempy')
const { run } = require('../../../runner')
const path = require('path')
const fs = require('fs-extra')

jest.setTimeout(10 * 60 * 1000)

describe('base theme tests', () => {
  const FIXTURE = path.join(
    process.cwd(),
    'tests',
    'integration',
    'generators',
    'fixtures',
    'has-screens'
  )

  const originalDir = process.cwd()
  let tempDir

  beforeEach(done => {
    tempDir = tempy.directory()
    fs.copySync(FIXTURE, tempDir)
    process.chdir(tempDir)
    done()
  })

  afterEach(done => {
    process.chdir(originalDir)
    fs.removeSync(tempDir)
    done()
  })

  test('should be able to create base theme', async () => {
    await run(
      ['t', 'n'],
      [
        // install anoa-react-native-theme package and generate base theme
        'y'
      ]
    )

    process.chdir('src/views/styles/themes')

    expect('base.ts').existsAndPrettySame(
      `import { createTheme } from 'anoa-react-native-theme'

      export const BaseTheme = createTheme(
        {
          // define theme variables
        },
        vars => ({
          // define theme styles
        })
      )
      `
    )
  })
})
