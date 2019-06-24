import { Project, SyntaxKind } from 'ts-morph'
import { RootContext } from '../../core/types'

export class InitThemeGenerator {
  private context: RootContext

  constructor(context: RootContext) {
    this.context = context
  }

  async generate() {
    const {
      folder,
      print: { spin, info, colors },
      tools
    } = this.context

    const cli = tools.cli()
    const npm = tools.npm()
    const utils = tools.utils()
    const source = tools.source()

    info(
      `This action will install ${colors.yellow(
        'anoa-react-native-theme'
      )} package and generate base theme code for you.`
    )
    if (!(await cli.confirm('Are you sure want to do this?'))) {
      return
    }

    const spinner = spin('Generating...')

    await npm.installPackagesIfNotExists(['anoa-react-native-theme'], false)

    await source.generate(
      'styles',
      folder.styles(),
      ['index.ts', 'themes/base.ts'],
      {
        themeNames: ['BaseTheme'],
        childThemes: [],
        defaultTheme: 'BaseTheme'
      }
    )

    await this.generateAppMainFile()

    spinner.succeed('Base theme code were successfully generated.')
    info('')
    info(
      `  Update your base theme on ${colors.yellow(
        utils.relativePath(folder.themes('base.ts'))
      )}`
    )
    info(`  You can add more theme by running this command again.`)
    info('')
  }

  private async generateAppMainFile() {
    const {
      folder,
      print: { spin, colors },
      tools
    } = this.context

    const spinner = spin(`Updating ${colors.cyan('App.tsx')}...`)

    const project = new Project()
    const utils = tools.utils()
    const source = tools.source()

    const appMainFile = project.addExistingSourceFile(folder.src('App.tsx'))
    if (appMainFile.getImportDeclaration('./views/styles')) {
      return
    }

    // add import store statement

    appMainFile.addImportDeclaration({
      moduleSpecifier: './views/styles',
      namedImports: ['AppStyle']
    })

    const appMainClass = appMainFile.getClass('App')
    // make up renderMain function

    const renderMainFunction = appMainClass.getMethod('renderMain')
    const ret = renderMainFunction
      .getBody()
      .getFirstDescendantByKind(SyntaxKind.ReturnStatement)

    const jsxStatement = (
      ret.getFirstDescendantByKind(SyntaxKind.JsxElement) ||
      ret.getFirstDescendantByKind(SyntaxKind.JsxSelfClosingElement)
    ).getText()

    renderMainFunction.setBodyText(`
      return (
        <AppStyle.Provider>
          ${jsxStatement}
        </AppStyle.Provider>
      )
      `)

    await source.prettifySoureFile(appMainFile)
    await project.save()

    spinner.succeed(
      `${colors.cyan('AppStyle.Provider')} applied to ${colors.cyan(
        'App.tsx'
      )} on ${colors.yellow(utils.relativePath(appMainFile.getFilePath()))}`
    )
  }
}
