import { fromPath } from 'ts-emitter'
import { RootContext } from '.'
import { SyntaxKind } from 'typescript'

export interface ThemeInfo {
  name: string
  path: string
  isDefault: boolean
}

export function styleThemes({ fileList }: RootContext) {
  const basePath = `src/views/styles/themes`

  function themeInfo(file: string): ThemeInfo | undefined {
    if (file === 'index.ts') {
      return undefined
    }

    let name = ''
    let isDefault = false
    const ast = fromPath(basePath + '/' + file)
    ast.forEachChild(c => {
      if (c.kind === SyntaxKind.VariableStatement) {
        const c0 = c.getChildAt(0)
        const c1 = c.getChildAt(1)

        if (
          c0.kind === SyntaxKind.SyntaxList &&
          c0.getText() === 'export' &&
          c1.kind === SyntaxKind.VariableDeclarationList
        ) {
          if (c1.getChildAt(0).kind === SyntaxKind.ConstKeyword) {
            const str = c1.getChildAt(1).getText()
            if (str.length) {
              name = str.split('=')[0].trim()
              isDefault = str.indexOf(' = createTheme(') > 0
            }
          }
        }
      }
    })

    if (!name) {
      return undefined
    }

    return {
      name,
      isDefault,
      path: file.substr(0, file.length - 3),
    }
  }

  return async () => {
    const files = await fileList(basePath)
    if (!files || !files.length) {
      return false
    }

    let themes = {}
    files.forEach(f => {
      const info = themeInfo(f.name)
      if (info) {
        themes[info.name] = info
      }
    })

    return themes as Record<string, ThemeInfo>
  }
}

export function styleCreateTheme({
  styleThemes,
  prompt,
  print,
  strings: { isBlank, pascalCase, kebabCase },
  parameters: { second },
  generateFiles,
  styleUpdateThemeExports,
  styleInit,
}: RootContext) {
  return async () => {
    let name = second

    if (!name) {
      name = (await prompt.ask([
        {
          name: 'name',
          message: 'Name of theme',
          type: 'input',
        },
      ])).name
    }

    if (isBlank(name)) {
      print.error('Name is required')
      process.exit(0)
      return
    }

    const themes = await styleThemes()
    if (!themes) {
      await createTheme(name)
    } else {
      let baseTheme = ''
      const choices = Object.keys(themes)
      if (choices.length > 1) {
        baseTheme = (await prompt.ask([
          {
            name: 'baseTheme',
            message: 'Choose the base theme',
            type: 'list',
            choices,
          },
        ])).baseTheme
      } else {
        baseTheme = choices[0]
      }

      if (isBlank(baseTheme)) {
        print.error('Base theme is required')
        process.exit(0)
        return
      }

      await createTheme(name, themes[baseTheme])
    }
  }

  async function createTheme(name: string, base?: ThemeInfo) {
    const fileName = `${kebabCase(name)}.ts`

    if (base) {
      await generateFiles(
        'shared/src/views/styles/themes/',
        ['child.ts'],
        'src/views/styles/themes/',
        {
          name: pascalCase(name),
          from: base.name,
          fromPath: base.path,
        },
        fileName,
      )
    } else {
      await generateFiles(
        'shared/src/views/styles/themes/',
        ['base.ts'],
        'src/views/styles/themes/',
        {
          name: pascalCase(name),
        },
        fileName,
      )
    }

    await styleUpdateThemeExports()

    print.success(
      `New theme was successfully created on '${print.colors.yellow(
        `src/views/styles/themes/${fileName}`,
      )}'`,
    )
  }
}

export function styleUpdateThemeExports({
  npmEnsure,
  styleThemes,
  generateFiles,
  strings: { camelCase },
}: RootContext) {
  return async () => {
    const themes = await styleThemes()
    let defaultTheme: ThemeInfo

    await npmEnsure(false, ['anoa-react-native-theme'])

    if (themes) {
      const exports = []
      const arrThemes: ThemeInfo[] = []
      Object.keys(themes).forEach(t => {
        const ti = themes[t]
        if (ti.isDefault) {
          defaultTheme = ti
        }
        arrThemes.push(ti)
        exports.push(`export {${t}} from './${ti.path}'`)
      })

      await generateFiles(
        'shared/src/views/styles/themes/',
        ['index.ts'],
        'src/views/styles/themes/',
        {
          exports,
        },
      )

      await generateFiles('shared/src/views/styles/', ['index.ts'], 'src/views/styles/', {
        defaultTheme: defaultTheme.name,
        themeNames: arrThemes.map(t => t.name),
        childThemes: arrThemes
          .filter(s => s.name !== defaultTheme.name)
          .map(t => `${camelCase(t.path)}: ${t.name}`),
      })
    }
  }
}
