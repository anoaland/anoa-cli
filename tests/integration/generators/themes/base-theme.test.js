const tempy = require('tempy')
const { run, DOWN, ENTER, SPACE, TAB } = require('../../../runner')
const path = require('path')
const fs = require('fs-extra')
const { filesystem } = require('gluegun')
const { Project } = require('ts-morph')

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

    const { exists, cwd } = filesystem
    const tsConfigFilePath = path.join(cwd(), 'tsconfig.json')
    expect(exists(tsConfigFilePath)).toBeTruthy()

    const project = new Project({
      tsConfigFilePath
    })

    process.chdir('src/views/styles/themes')

    const baseThemeFile = project.addExistingSourceFile('base.ts')
    expect(baseThemeFile.getText().replace(/\s+/gm, ` `)).toEqual(
`import { createTheme } from 'anoa-react-native-theme'

export const BaseTheme = createTheme(
  {
    // define theme variables
  },
  vars => ({
    // define theme styles
  })
)
`.replace(/\s+/gm, ` `)
    )
  })
})
