const tempy = require('tempy')
const { run, DOWN, ENTER, SPACE, TAB } = require('../../../runner')
const path = require('path')
const fs = require('fs-extra')
const { filesystem } = require('gluegun')
const { Project } = require('ts-morph')

jest.setTimeout(10 * 60 * 1000)

describe('child theme tests', () => {
  const FIXTURE = path.join(
    process.cwd(),
    'tests',
    'integration',
    'generators',
    'fixtures',
    'has-themes'
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

  test('should be able to create child theme', async () => {
    await run(
      ['t', 'n'],
      [
        // Enter name of theme
        'yellow',
        ENTER,

        // Select parent theme
        DOWN, // SecondaryTheme
        ENTER
      ]
    )

    const { exists, cwd } = filesystem
    const tsConfigFilePath = path.join(cwd(), 'tsconfig.json')
    expect(exists(tsConfigFilePath)).toBeTruthy()

    const project = new Project({
      tsConfigFilePath
    })

    const childThemeFile = project.addExistingSourceFile(
      'src/views/styles/themes/yellow-theme.ts'
    )
    expect(childThemeFile.getText().replace(/\s+/gm, ` `)).toEqual(
      `import { SecondaryTheme } from './secondary-theme'

      export const YellowTheme = SecondaryTheme.extend(
        {
          // override default theme variables
        },
        vars => ({
          // override default theme styles
        })
      )
      `.replace(/\s+/gm, ` `)
    )

    const stylesFile = project.addExistingSourceFile(
      'src/views/styles/index.ts'
    )
    expect(stylesFile.getText().replace(/\s+/gm, ` `)).toEqual(
      `import { ThemeContext, ThemeContextProps } from 'anoa-react-native-theme'
      import { BaseTheme } from './themes/base'
      import { SecondaryTheme } from './themes/secondary-theme'
      import { YellowTheme } from './themes/yellow-theme'
      
      const themes = {
        secondary: SecondaryTheme,
        yellow: YellowTheme
      }
      
      export const AppStyle = new ThemeContext(BaseTheme, themes)
      export type AppThemes = typeof themes
      export type AppStyleProps = ThemeContextProps<typeof BaseTheme, AppThemes>
      `.replace(/\s+/gm, ` `)
    )
  })
})
