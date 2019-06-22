import * as path from 'path'
import { Project, SyntaxKind, VariableDeclarationKind } from 'ts-morph'
import { RootContext } from '../../../../tools/context'
import { Npm, Source, Utils } from '../../../core'
import { ReactUtils } from '../../../core/react-utils'
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
    if (!this.isBaseThemeExist()) {
      await this.initBaseTheme()
    } else {
      await this.buildChildTheme()
    }
  }

  async buildChildTheme() {
    await this.qa.run()

    const {
      folder,
      filesystem: { cwd },
      strings: { camelCase, kebabCase },
      print: { spin, colors }
    } = this.context

    const spinner = spin('Generating...')

    const { name, filePath, base } = this.qa.result

    const themeFile = this.project.createSourceFile(filePath)
    ReactUtils.addNamedImport(themeFile, base.path, base.name)

    themeFile.addVariableStatement({
      isExported: true,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name,
          initializer: `${base.name}.extend(
            {
              // override default theme variables
            },
            vars => ({
              // override default theme styles
            })
          )`
        }
      ]
    })

    const stylesFile = this.project.addExistingSourceFile(
      path.join(cwd(), folder.styles('index.ts'))
    )

    stylesFile.addImportDeclaration({
      namedImports: [name],
      moduleSpecifier: `./themes/${kebabCase(name)}`
    })

    const themesInitializer = stylesFile
      .getVariableDeclaration('themes')
      .getInitializerIfKind(SyntaxKind.ObjectLiteralExpression)
    themesInitializer.addPropertyAssignment({
      name: camelCase(name.replace(/Theme$/g, '')),
      initializer: name
    })

    await this.source.prettifySoureFile(themeFile)
    await this.source.prettifySoureFile(stylesFile)
    await this.project.save()

    spinner.succeed(
      `New ${colors.cyan(
        name
      )} theme was successfully generated on ${colors.yellow(
        this.utils.relativePath(filePath)
      )}`
    )
  }

  async initBaseTheme() {
    const {
      folder,
      print: { spin, info, colors }
    } = this.context

    info(
      `This action will install ${colors.yellow(
        'anoa-react-native-theme'
      )} package and generate base theme code for you.`
    )
    if (!(await this.utils.confirm('Are you sure want to do this?'))) {
      return
    }

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
