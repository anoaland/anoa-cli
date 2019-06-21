import * as path from 'path'
import {
  ArrowFunction,
  CallExpression,
  ClassDeclaration,
  FunctionDeclaration,
  MethodDeclaration,
  Project,
  SourceFile,
  SyntaxKind,
  VariableDeclarationKind
} from 'ts-morph'
import { RootContext } from '../../../../libs'
import { ProjectTypes } from '../../../../libs/config'
import { Npm, Source, Utils } from '../../../core'
import { ReactUtils } from '../../../core/react-utils'
import { ViewTypeEnum } from '../../../../generators/views/types'
import { NavigatorTypeEnum } from './nav-types'
import { CreateNavigatorBuilderQA } from './qa'

export class CreateNavigatorBuilder {
  context: RootContext
  qa: CreateNavigatorBuilderQA
  project: Project
  source: Source
  npm: Npm
  sourceFile: SourceFile
  navigatorFn: string
  screenFile: SourceFile
  utils: Utils
  gestureHandlerInstalled: boolean

  constructor(context: RootContext) {
    this.context = context
    this.qa = new CreateNavigatorBuilderQA(this.context)
    this.project = new Project()
    this.source = new Source(context)
    this.npm = new Npm(context)
    this.utils = new Utils(context)
  }

  async build() {
    await this.qa.run()
    this.navigatorFn = this.getNavigatorFn()
    await this.generate()
  }

  async generate() {
    const {
      result: { name, screenToAttach }
    } = this.qa

    const {
      strings: { kebabCase },
      print: { info, colors, warning, spin, checkmark }
    } = this.context

    const spinner = spin('Generating...')

    const { folder } = this.context
    const filePath = screenToAttach
      ? path.join(
          path.dirname(screenToAttach.sourceFile.getFilePath()),
          'nav.ts'
        )
      : folder.navigator(kebabCase(name) + '.ts')

    this.sourceFile = this.project.createSourceFile(filePath)

    this.sourceFile.addImportDeclaration({
      namedImports: [this.navigatorFn, 'createAppContainer'],
      moduleSpecifier: 'react-navigation'
    })

    this.sourceFile.addVariableStatement({
      isExported: true,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name,
          initializer: this.generateNavigator()
        }
      ]
    })

    const screenAttached = this.attachToScreen()

    await this.source.prettifySoureFile(this.sourceFile)
    if (screenToAttach) {
      await this.source.prettifySoureFile(this.screenFile)
    }

    await this.installNpmPackages()

    await this.project.save()

    spinner.succeed(
      `Navigator successfully created on ${colors.yellow(
        this.utils.relativePath(filePath)
      )}`
    )

    if (screenToAttach) {
      const screenPath = colors.yellow(
        this.utils.relativePath(this.screenFile.getFilePath())
      )
      if (screenAttached) {
        info(`${checkmark} Navigator successfully attached to ${screenPath}`)
      } else {
        warning(
          `  Could not attach navigator to ${screenPath}. You should do it manually.`
        )
      }
    }

    if (this.gestureHandlerInstalled) {
      info('')
      info(
        `  The ${colors.bold(
          'react-native-gesture-handler'
        )} has been installed but not linked yet into the project.`
      )
      info(
        `  Please follow ${colors.yellow(
          'https://reactnavigation.org/docs/en/getting-started.html#installation'
        )} instructions to link all native dependencies.`
      )
    }
  }

  async installNpmPackages() {
    const packages = ['react-navigation']
    const projectType = await this.utils.getProjectType()

    if (projectType === ProjectTypes.REACT_NATIVE_INIT) {
      packages.push('react-native-gesture-handler')
    }

    const installedPkgs = await this.npm.installPackagesIfNotExists(
      packages,
      false
    )
    if (installedPkgs.indexOf('react-native-gesture-handler') > -1) {
      this.gestureHandlerInstalled = true
    }
  }

  private generateNavigator() {
    const {
      result: { routes, initialRoute }
    } = this.qa

    for (const r of routes) {
      ReactUtils.addNamedImport(
        this.sourceFile,
        r.screen.path,
        r.screen.info.name
      )
    }

    return `createAppContainer(${this.navigatorFn}({
      ${routes
        .map(
          r => `
        ${r.routeName}: {
          screen: ${r.screen.info.name},
            navigationOptions: {
              title: '${r.title}'
            }
        }
      `
        )
        .join(',')}
    }, {
      initialRouteName: '${initialRoute.routeName}'
    }))`
  }

  private getNavigatorFn() {
    const {
      result: { type }
    } = this.qa

    switch (type) {
      case NavigatorTypeEnum.switch:
        return 'createSwitchNavigator'

      case NavigatorTypeEnum.stack:
        return 'createStackNavigator'

      case NavigatorTypeEnum.materialTopTab:
        return 'createMaterialTopTabNavigator'

      case NavigatorTypeEnum.materialBottomTab:
        return 'createBottomTabNavigator'

      default:
        return 'createDrawerNavigator'
    }
  }

  private attachToScreen(): boolean {
    const {
      result: { screenToAttach, name }
    } = this.qa
    if (!screenToAttach) {
      return false
    }

    this.screenFile = this.project.addExistingSourceFile(
      screenToAttach.sourceFile.getFilePath()
    )

    ReactUtils.addNamedImport(
      this.screenFile,
      this.sourceFile.getFilePath(),
      name
    )

    switch (screenToAttach.info.type) {
      case ViewTypeEnum.classComponent:
        return this.attachToClass(
          this.screenFile.getClass(screenToAttach.info.name)
        )

      case ViewTypeEnum.functionComponent:
        return this.attachToFunction(screenToAttach.info.name, this.screenFile)

      case ViewTypeEnum.arrowFunctionComponent:
        return this.attachToArrowFunction(
          screenToAttach.info.name,
          this.screenFile
        )
    }

    return false
  }

  private attachToArrowFunction(name: string, screenFile: SourceFile): boolean {
    const vd = screenFile.getVariableDeclaration(name)
    if (!vd) {
      return false
    }

    let arrowFn = vd.getInitializerIfKind(SyntaxKind.ArrowFunction)
    if (!arrowFn) {
      const callExp = vd.getInitializerIfKind(SyntaxKind.CallExpression)
      if (!callExp) {
        return false
      }

      arrowFn = callExp.getFirstChildByKind(SyntaxKind.ArrowFunction)
    }

    if (!arrowFn) {
      return false
    }

    this.setFunctionBody(arrowFn)
    return true
  }

  private attachToFunction(name: string, screenFile: SourceFile): boolean {
    let fn = screenFile.getFunction(name)
    if (!fn) {
      const vd = screenFile.getVariableDeclaration(name)
      if (!vd || !vd.isExported()) {
        return false
      }

      const initializer = vd.getInitializer() as CallExpression

      if (!initializer || !initializer.getArguments) {
        return false
      }

      const args = initializer.getArguments()
      if (!args.length) {
        return false
      }

      fn = screenFile.getFunction(args[0].getText())
    }

    if (!fn) {
      return false
    }

    this.setFunctionBody(fn)
    return true
  }

  private attachToClass(clazz: ClassDeclaration): boolean {
    const renderFn = clazz.getMethod('render')
    if (!renderFn) {
      return false
    }

    this.setFunctionBody(renderFn)
    return true
  }

  private setFunctionBody(
    fn: MethodDeclaration | FunctionDeclaration | ArrowFunction
  ) {
    const originalBody = fn.getBodyText()
    fn.setBodyText(`
    return <${this.qa.result.name}/>
    /*
    ${originalBody}
    */`)
  }
}
