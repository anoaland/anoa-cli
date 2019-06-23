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
import { ProjectTypes } from '../../config'
import {
  CreateNavigatorArgs,
  NavigatorTypeEnum,
  RootContext,
  ViewTypeEnum
} from '../../core/types'

export class NavigatorGenerator {
  private context: RootContext
  private args: CreateNavigatorArgs
  private project: Project
  private sourceFile: SourceFile
  private screenFile: SourceFile
  private gestureHandlerInstalled: boolean
  private navigatorFn: string

  constructor(context: RootContext) {
    this.context = context
  }

  async generate(args: CreateNavigatorArgs) {
    const {
      strings: { kebabCase },
      print: { info, colors, warning, spin, checkmark },
      tools
    } = this.context

    this.args = args

    const { name, screenToAttach } = args

    const spinner = spin('Generating...')

    this.navigatorFn = this.getNavigatorFn()

    const { folder } = this.context
    const filePath = screenToAttach
      ? path.join(
          path.dirname(screenToAttach.sourceFile.getFilePath()),
          'nav.ts'
        )
      : folder.navigator(kebabCase(name) + '.ts')

    this.project = new Project()
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

    const source = tools.source()

    await source.prettifySoureFile(this.sourceFile)
    if (screenToAttach) {
      await source.prettifySoureFile(this.screenFile)
    }

    await this.installNpmPackages()

    await this.project.save()

    const utils = tools.utils()
    spinner.succeed(
      `Navigator successfully created on ${colors.yellow(
        utils.relativePath(filePath)
      )}`
    )

    if (screenToAttach) {
      const screenPath = colors.yellow(
        utils.relativePath(this.screenFile.getFilePath())
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
    const { tools } = this.context
    const packages = ['react-navigation']
    const projectType = await tools.project().getProjectType()

    if (projectType === ProjectTypes.REACT_NATIVE_INIT) {
      packages.push('react-native-gesture-handler')
    }

    const installedPkgs = await tools
      .npm()
      .installPackagesIfNotExists(packages, false)
    if (installedPkgs.indexOf('react-native-gesture-handler') > -1) {
      this.gestureHandlerInstalled = true
    }
  }

  private generateNavigator() {
    const { routes, initialRoute } = this.args
    const { tools } = this.context
    const ts = tools.ts()

    for (const r of routes) {
      ts.addNamedImport(
        this.sourceFile,
        r.screen.sourceFile.getFilePath(),
        r.screen.name
      )
    }

    return `createAppContainer(${this.navigatorFn}({
      ${routes
        .map(
          r => `
        ${r.routeName}: {
          screen: ${r.screen.name},
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
    const { type } = this.args

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
    const { screenToAttach, name } = this.args
    if (!screenToAttach) {
      return false
    }

    this.screenFile = this.project.addExistingSourceFile(
      screenToAttach.sourceFile.getFilePath()
    )

    const {
      tools: { ts }
    } = this.context

    ts().addNamedImport(this.screenFile, this.sourceFile.getFilePath(), name)

    switch (screenToAttach.type) {
      case ViewTypeEnum.classComponent:
        return this.attachToClass(this.screenFile.getClass(screenToAttach.name))

      case ViewTypeEnum.functionComponent:
        return this.attachToFunction(screenToAttach.name, this.screenFile)

      case ViewTypeEnum.arrowFunctionComponent:
        return this.attachToArrowFunction(screenToAttach.name, this.screenFile)
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
    return <${this.args.name}/>
    /*
    ${originalBody}
    */`)
  }
}
