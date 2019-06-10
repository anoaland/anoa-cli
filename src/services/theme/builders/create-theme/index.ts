import { Project, SyntaxKind } from 'ts-morph'
import { RootContext } from '../../../../libs'
import { Npm, Source, Utils } from '../../../core'
import { CreateThemeBuilderQA } from './qa'

export class CreateThemeBuilder {
  context: RootContext
  qa: CreateThemeBuilderQA
  project: Project
  source: Source
  npm: Npm
  utils: Utils

  constructor(context: RootContext) {
    this.context = context
    this.qa = new CreateThemeBuilderQA(this.context)
    this.project = new Project()
    this.source = new Source(context)
    this.npm = new Npm(context)
    this.utils = new Utils(context)
  }

  async build() {
    const {
      print: { info, colors }
    } = this.context
    if (!this.isBaseThemeExist()) {
      info(
        `This action will install ${colors.yellow(
          'anoa-react-native-theme'
        )} package and generate base theme code for you.`
      )
      if (!(await this.utils.confirm('Are you sure want to do this?'))) {
        return
      }
      await this.initBaseTheme()
      return
    }
    await this.qa.run()
  }

  async initBaseTheme() {
    const {
      folder,
      print: { spin, info, colors }
    } = this.context

    const spinner = spin('Generating...')

    await this.npm.installPackagesIfNotExists(
      ['anoa-react-native-theme'],
      false
    )

    await this.source.generate(
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
        this.utils.relativePath(folder.themes('base.ts'))
      )}`
    )
    info(`  You can add more theme by running this command again.`)
    info('')
  }

  async generateAppMainFile() {
    const {
      folder,
      print: { spin, colors }
    } = this.context

    const spinner = spin(`Updating ${colors.cyan('App.tsx')}...`)

    const appMainFile = this.project.addExistingSourceFile(
      folder.src('App.tsx')
    )
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

    await this.source.prettifySoureFile(appMainFile)
    await this.project.save()

    spinner.succeed(
      `${colors.cyan('AppStyle.Provider')} applied to ${colors.cyan(
        'App.tsx'
      )} on ${colors.yellow(
        this.utils.relativePath(appMainFile.getFilePath())
      )}`
    )
  }

  isBaseThemeExist() {
    const {
      filesystem: { exists },
      folder
    } = this.context
    return exists(folder.styles('index.ts'))
  }
}
