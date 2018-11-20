import { RootContext } from '.'
import { SyntaxKind, CallExpression } from 'ts-simple-ast'
import { ExportedNamePath } from './types'

export interface ThemeInfo {
  name: string
  path: string
  isDefault: boolean
}

type Themes = Record<string, ThemeInfo>

class Style {
  context: RootContext
  constructor(context: RootContext) {
    this.context = context
  }

  async init() {
    const { npm, init } = this.context
    await init()
    await npm.ensurePackages(['anoa-react-native-theme'], false)
  }

  /**
   * Get all named themes
   */
  async themes(except?: string): Promise<Themes | undefined> {
    const { utils } = this.context
    const basePath = `src/views/styles/themes`

    const files = await utils.fileList(basePath)
    if (!files || !files.length) {
      return undefined
    }

    // should refresh ast, since new theme probably added
    utils.refreshAst()

    let themes: Themes = {}
    files.forEach(f => {
      if (f.name !== 'index.ts' && f.name !== (except || '').toLowerCase() + '.ts') {
        const { sourceFile } = utils.ast(basePath + '/' + f.name)
        sourceFile.getExportedDeclarations().forEach(e => {
          const identifier = e.getFirstChildByKind(SyntaxKind.Identifier).getText()
          const expression = e.getFirstChildByKind(SyntaxKind.CallExpression).getText()

          const path = f.name.substr(0, f.name.length - 3)

          if (identifier.endsWith('Theme')) {
            themes[path] = {
              name: identifier,
              path,
              isDefault: expression.startsWith('createTheme'),
            }
          }
        })
      }
    })

    return themes
  }

  async createTheme() {
    const {
      prompt,
      print,
      strings: { isBlank },
      parameters: { second },
    } = this.context

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

    const themes = await this.themes(name)
    if (!themes) {
      await this._createTheme(name)
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

      await this._createTheme(name, themes[baseTheme])
    }
  }

  private async _createTheme(name: string, base?: ThemeInfo) {
    const {
      strings: { kebabCase, pascalCase },
      print,
      utils,
    } = this.context

    await this.init()
    const fileName = `${kebabCase(name)}.ts`

    if (base) {
      await utils.generate(
        'shared/src/views/styles/themes/',
        'src/views/styles/themes/',
        [{ source: 'child.ts', dest: fileName }],
        {
          name: pascalCase(name),
          from: base.name,
          fromPath: base.path,
        },
      )
    } else {
      await utils.generate(
        'shared/src/views/styles/themes/',
        'src/views/styles/themes/',
        [{ source: 'base.ts', dest: fileName }],
        {
          name: pascalCase(name),
        },
      )
    }

    await this.updateThemeExports()

    print.success(
      `New theme was successfully created on '${print.colors.yellow(
        `src/views/styles/themes/${fileName}`,
      )}'`,
    )
  }

  async updateThemeExports() {
    const {
      utils,
      strings: { camelCase },
    } = this.context

    const themes = await this.themes()
    let defaultTheme: ThemeInfo

    if (themes) {
      const exports = []
      const arrThemes: ThemeInfo[] = []
      Object.keys(themes).forEach(t => {
        const ti = themes[t]
        if (ti.isDefault) {
          defaultTheme = ti
        }
        arrThemes.push(ti)
        exports.push(`export {${ti.name}} from './${ti.path}'`)
      })

      await utils.generate(
        'shared/src/views/styles/themes/',
        'src/views/styles/themes/',
        ['index.ts'],
        {
          exports,
        },
      )

      await utils.generate('shared/src/views/styles/', 'src/views/styles/', ['index.ts'], {
        defaultTheme: defaultTheme.name,
        themeNames: arrThemes.map(t => t.name),
        childThemes: arrThemes
          .filter(s => s.name !== defaultTheme.name)
          .map(t => `${camelCase(t.path)}: ${t.name}`),
      })

      const appTsx = utils.ast('src/App.tsx')
      appTsx.addNamedImports('./views/styles', ['AppStyle'])
      appTsx.wrapJsxTag('App', 'renderMain', 'AppStyle.Provider')
      appTsx.save()
    }
  }

  async connectTheme() {
    const { prompt, print, view } = this.context

    const { kind } = await prompt.ask({
      name: 'kind',
      message: 'What kind of view would you like to connect to theme?',
      type: 'list',
      choices: ['Component', 'Screen'],
    })

    const dir = `src/views/${kind.toLowerCase()}s`
    const viewInfoList = await view.viewInfoList(kind.toLowerCase())

    if (!viewInfoList.length) {
      print.error(`We could not find any ${kind} in this project.`)
      process.exit(0)
      return
    }

    const { target } = await prompt.ask({
      name: 'target',
      message: `Select the ${kind} you want to connect to`,
      type: 'list',
      choices: viewInfoList.map(v => v.option),
    })

    const viewInfo = viewInfoList.find(v => v.option === target)

    switch (viewInfo.type) {
      case 'class':
        this.connectThemeToViewClass(dir, viewInfo)
        break

      case 'hoc':
        this.connectThemeToHocView(dir, viewInfo)
        break

      case 'stateless':
        this.connectThemeToStatelessView(dir, viewInfo)
        break

      case 'functional':
        this.connectThemeToStatelessFunctionalView(dir, viewInfo)
        break
    }
  }

  connectThemeToHocView(dir: string, { name, path }: ExportedNamePath) {
    const { utils, print } = this.context
    const viewAst = utils.ast(`${dir + path}/index.tsx`)
    const viewFile = viewAst.sourceFile

    let varStmt = viewFile.getVariableStatement(fn => {
      return !!fn.getStructure().declarations.find(d => d.name === name)
    })

    if (!varStmt) {
      print.warning(`Could not connect store to ${name}.`)
      return false
    }

    const dec = varStmt.getDeclarations()[0]
    let initializer = dec.getInitializer()

    if (initializer.getText().indexOf(`AppStyle.withTheme`) > -1) {
      print.warning('Seems this component already connected to theme.')
      process.exit(0)
      return
    }

    let success = false
    if (initializer.getKind() === SyntaxKind.CallExpression) {
      const callExp = initializer as CallExpression
      const arg = callExp.getArguments()[0]
      if (arg) {
        const newArg = `AppStyle.withTheme<${name}Props>(${arg.getText()})`
        callExp.removeArgument(arg)
        callExp.addArgument(newArg)

        const viewDir = dir + path
        viewAst.addNamedImports(utils.relative('src/views/styles', `${viewDir}`), ['AppStyle'])
        viewAst.sortImports()
        viewAst.save()

        this._extendsPropsStyle(name, viewDir)
        success = true
      }
    }

    if (!success) {
      print.error('Could not connect theme to this view.')
      process.exit(0)
      return
    }

    print.success(`Theme was successfully connected to ${print.colors.magenta(name)}.`)
  }

  connectThemeToViewClass(dir: string, { name, path }: ExportedNamePath) {
    const { utils, print } = this.context
    const viewDir = dir + path

    const viewAst = utils.ast(`${viewDir}/index.tsx`)
    const viewFile = viewAst.sourceFile

    const clazz = viewFile.getClass(name)

    viewAst.addNamedImports(utils.relative('src/views/styles', `${viewDir}`), ['AppStyle'])

    // decorate the class
    const decoratorName = 'AppStyle.withThemeClass'
    if (!clazz.getDecorator(d => d.getFullName() === decoratorName)) {
      clazz.addDecorator({
        name: decoratorName,
        arguments: [],
      })
      viewAst.sortImports()
      viewAst.save()
    }

    this._extendsPropsStyle(name, viewDir)

    print.success(`Theme was successfully connected to ${print.colors.magenta(name)}.`)
    print.success(
      `Use ${print.colors.yellow(
        `const { theme } = this.props as Required<${name}Props>`,
      )} in the render function to access theme.`,
    )
  }

  connectThemeToStatelessView(dir: string, { name, path }: ExportedNamePath) {
    const { utils, print } = this.context
    const viewDir = dir + path

    const viewAst = utils.ast(`${viewDir}/index.tsx`)
    const viewFile = viewAst.sourceFile

    const viewFn = viewFile.getFunction(name)
    if (!viewFn) {
      if (viewFile.getText().indexOf(`AppStyle.withTheme`) > -1) {
        print.warning('Seems this component already connected to theme.')
      } else {
        print.warning('Could not connect theme to this component.')
      }
      process.exit(0)
      return
    }

    viewFn.setIsExported(false)
    viewFn.rename(`_${name}`)

    viewAst.addNamedImports(utils.relative('src/views/styles', `${viewDir}`), ['AppStyle'])
    viewAst.sortImports()
    viewFile.addStatements(`\r\nexport const ${name} = AppStyle.withTheme(_${name})`)

    viewAst.save()

    this._extendsPropsStyle(name, viewDir)

    print.success(`Theme was successfully connected to ${print.colors.magenta(name)}.`)
    print.success(
      `Use ${print.colors.yellow(
        `const { theme } = props as Required<${name}Props>`,
      )} in the ${print.colors.magenta(name)} function to access theme.`,
    )
  }

  connectThemeToStatelessFunctionalView(dir: string, { name, path }: ExportedNamePath) {
    const { utils, print } = this.context
    const viewDir = dir + path

    const viewAst = utils.ast(`${viewDir}/index.tsx`)
    const viewFile = viewAst.sourceFile

    const exported = viewFile
      .getExportedDeclarations()
      .find(e => e.getFirstChildByKind(SyntaxKind.Identifier).getText() === name)

    let param = undefined
    let block = undefined
    const arrowFn = exported.getFirstChildByKind(SyntaxKind.ArrowFunction)

    arrowFn.forEachChild(c => {
      if (c.getKind() === SyntaxKind.Parameter && !param) {
        param = c.getText()
      }

      if (c.getKind() === SyntaxKind.Block && !block) {
        block = c.getText()
      }
    })

    if (!param || !block) {
      print.error('Could not connect theme to this component')
      process.exit(0)
      return
    }

    const stmt = `${name} = AppStyle.withTheme<${name}Props>((${param}) => ${block})`

    viewAst.addNamedImports(utils.relative('src/views/styles', `${viewDir}`), ['AppStyle'])
    viewAst.sortImports()
    exported.replaceWithText(stmt)
    viewAst.save()

    print.success(`Theme was successfully connected to ${print.colors.magenta(name)}.`)
    print.success(
      `The parameter ${print.colors.yellow(param)} in the ${print.colors.magenta(
        name,
      )} function should now contains theme props.`,
    )
  }

  private _extendsPropsStyle(name: string, viewDir: string) {
    const { utils } = this.context
    const propsAst = utils.ast(`${viewDir}/props.tsx`)
    propsAst
      .extendsInterface(
        `${name}Props`,
        ['AppStyleProps'],
        true,
        utils.relative('src/views/styles', `${viewDir}`),
      )
      .save()
  }
}

export function style(context: RootContext) {
  return new Style(context)
}
