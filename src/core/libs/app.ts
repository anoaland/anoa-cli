import { ClassDeclaration, SyntaxKind } from 'ts-morph'
import { AppProvider, RootContext } from '../types'
import { Lib } from './lib'

export class App extends Lib {
  private clazz: ClassDeclaration

  constructor(context: RootContext) {
    super(context)
    const {
      folder,
      tools: { source }
    } = context
    this.sourceFile = source().project.addExistingSourceFile(
      folder.src('App.tsx')
    )
  }

  addProvider(provider: AppProvider) {
    const { name, moduleSpecifier, prepareStatement } = provider
    if (this.hasImportDeclaration(moduleSpecifier)) {
      return
    }

    const dotIndex = name.indexOf('.')
    const namedImport = dotIndex > 0 ? name.substr(0, dotIndex) : name
    this.sourceFile.addImportDeclaration({
      moduleSpecifier,
      namedImports: [namedImport]
    })

    this.wrapRenderMainBody(name)

    if (prepareStatement) {
      this.addPrepareStatement(prepareStatement)
    }
  }

  getClass() {
    if (this.clazz) {
      return this.clazz
    }
    return (this.clazz = this.sourceFile.getClass('App'))
  }

  wrapRenderMainBody(wrapper: string) {
    const renderMainFunction = this.getClass().getMethod('renderMain')
    const ret = renderMainFunction
      .getBody()
      .getFirstDescendantByKind(SyntaxKind.ReturnStatement)

    const jsxStatement = (
      ret.getFirstDescendantByKind(SyntaxKind.JsxElement) ||
      ret.getFirstDescendantByKind(SyntaxKind.JsxSelfClosingElement)
    ).getText()

    renderMainFunction.setBodyText(`
      return (
        <${wrapper}>
          ${jsxStatement}
        </${wrapper}>
      )
      `)
  }

  addPrepareStatement(stmt: string) {
    const prepareFunction = this.getClass().getMethod('prepare')
    prepareFunction.addStatements(stmt)
  }
}
