import * as path from 'path'
import {
  ArrowFunction,
  CallExpression,
  Project,
  SourceFile,
  SyntaxKind,
  VariableDeclaration
} from 'ts-morph'
import { RootContext } from '../../../../libs'
import { Npm, Source, Utils } from '../../../core'
import { BrowseViewInfo } from '../../../core/project-browser'
import { ReactUtils } from '../../../core/react-utils'
import { ViewTypeEnum } from '../../../views/enums'
import { ConnectThemeBuilderQA } from './qa'

export class ConnectThemeBuilder {
  context: RootContext
  qa: ConnectThemeBuilderQA
  project: Project
  source: Source
  npm: Npm
  utils: Utils

  constructor(context: RootContext) {
    this.context = context
    this.qa = new ConnectThemeBuilderQA(this.context)
    this.project = new Project()
    this.source = new Source(context)
    this.npm = new Npm(context)
    this.utils = new Utils(context)
  }

  async build() {
    await this.qa.run()
    const {
      print: { spin, fancy, colors }
    } = this.context
    const spinner = spin('Generating...')
    const { views } = this.qa.result
    for (const view of views) {
      await this.applyTheme(view)
    }
    await this.project.save()
    spinner.succeed('Theme was successfully connected to:')
    fancy(
      views
        .map(
          v =>
            `  · ${colors.cyan(v.info.name)} on ${colors.yellow(
              this.utils.relativePath(v.path)
            )}`
        )
        .join('\r\n')
    )
  }

  async applyTheme(view: BrowseViewInfo) {
    const viewFile = this.project.addExistingSourceFile(
      view.sourceFile.getFilePath()
    )

    let applied = false
    const propsName = this.getPropsName(view)

    switch (view.info.type) {
      case ViewTypeEnum.classBased:
        applied = this.applyThemeToClass(view, viewFile, propsName)
        break

      case ViewTypeEnum.stateless:
        applied = this.applyThemeToFunction(view, viewFile, propsName)
        break

      case ViewTypeEnum.statelessFunctional:
        applied = this.applyThemeToArrowFunction(view, viewFile, propsName)
        break
    }

    if (applied) {
      await this.updateProps(view, viewFile, propsName)
      this.updateImports(viewFile, propsName)
      await this.source.prettifySoureFile(viewFile)
    } else {
      this.project.removeSourceFile(viewFile)
    }
  }

  private applyThemeToClass(
    view: BrowseViewInfo,
    viewFile: SourceFile,
    propsName: string
  ): boolean {
    const clazz = viewFile.getClass(view.info.name)
    if (
      clazz.getDecorator(d =>
        d.getFullName().startsWith('AppStyle.withThemeClass')
      )
    ) {
      return false
    }

    clazz.addDecorator({
      name: 'AppStyle.withThemeClass()'
    })

    this.updateImports(viewFile, propsName)
    return true
  }

  private applyThemeToFunction(
    view: BrowseViewInfo,
    viewFile: SourceFile,
    propsName: string
  ): boolean {
    const viewVar = ReactUtils.getOrCreateViewVarOfStatelessView(
      viewFile,
      view.info,
      propsName
    )

    return this.applyThemeToVariable(viewVar, viewFile, propsName)
  }

  private applyThemeToArrowFunction(
    view: BrowseViewInfo,
    viewFile: SourceFile,
    propsName: string
  ): boolean {
    const viewVar = viewFile.getVariableDeclaration(view.info.name)
    return this.applyThemeToVariable(viewVar, viewFile, propsName)
  }

  private applyThemeToVariable(
    viewVar: VariableDeclaration,
    viewFile: SourceFile,
    propsName: string
  ): boolean {
    const hoc = `AppStyle.withTheme`
    const identifier = viewVar.getFirstChild(
      c =>
        c.getKind() === SyntaxKind.CallExpression && c.getText().startsWith(hoc)
    )

    let callExp: CallExpression
    if (identifier) {
      if (identifier.getText().startsWith(hoc)) {
        return false
      }

      callExp = identifier.getFirstChildByKind(SyntaxKind.CallExpression)
    }

    if (!callExp) {
      const arrowFn = viewVar.getInitializer() as ArrowFunction // viewVar.getFirstDescendantByKind(SyntaxKind.ArrowFunction)
      if (arrowFn.getParameters) {
        ReactUtils.setFunctionPropsParams(arrowFn, propsName)
      }
      viewVar.replaceWithText(
        `${viewVar.getName()} = ${hoc}(${arrowFn.getText()})`
      )

      this.updateImports(viewFile, propsName)
      return true
    }

    return false
  }

  private updateImports(viewFile: SourceFile, propsName: string) {
    const {
      folder,
      filesystem: { cwd }
    } = this.context

    ReactUtils.addNamedImport(
      viewFile,
      path.join(cwd(), folder.styles('index.ts')),
      'AppStyle'
    )

    viewFile.addImportDeclaration({
      namedImports: [propsName],
      moduleSpecifier: './props'
    })
  }

  private async updateProps(
    view: BrowseViewInfo,
    viewFile: SourceFile,
    propsName: string
  ) {
    const {
      filesystem: { exists, cwd },
      folder
    } = this.context

    const propsPath = path.join(path.dirname(view.path), 'props.ts')

    const propsFile = exists(propsPath)
      ? this.project.addExistingSourceFile(propsPath)
      : this.project.createSourceFile(propsPath)

    const propsInterface =
      propsFile.getInterface(propsName) ||
      propsFile.addInterface({
        name: propsName,
        isExported: true
      })

    ReactUtils.extendsInterface(propsInterface, 'AppStyleProps')
    ReactUtils.addNamedImport(
      propsFile,
      path.join(cwd(), folder.styles('index.ts')),
      'AppStyleProps'
    )

    if (view.info.type === ViewTypeEnum.classBased) {
      ReactUtils.addPropsReferenceToClassView(
        viewFile.getClass(view.info.name),
        propsInterface
      )
    }

    await this.source.prettifySoureFile(propsFile)
  }

  private getPropsName(view: BrowseViewInfo) {
    const { naming } = this.context
    const propsName = view.info.props || naming.props(view.info.name)
    return propsName
  }
}
