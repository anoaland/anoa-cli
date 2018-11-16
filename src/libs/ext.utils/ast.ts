import { RootContext } from '..'
import { Project, SourceFile, SyntaxKind, PropertySignatureStructure } from 'ts-simple-ast'
import * as R from 'ramda'

export class Ast {
  context: RootContext
  project: Project
  sourceFile: SourceFile
  filepath: string

  constructor(context: RootContext, project: Project, filepath: string) {
    const {
      filesystem: { cwd },
    } = context

    this.filepath = filepath
    this.context = context
    this.project = project
    this.sourceFile = project.getSourceFile(cwd(filepath).cwd())
  }

  addNamedImports(fromModule: string, namedImports: string[]) {
    const { sourceFile } = this

    let existingNamedImports = []
    const existings = sourceFile.getImportDeclaration(fromModule)
    if (existings) {
      existingNamedImports = existings.getNamedImports().map(ni => ni.getText())
      existings.remove()
    }

    sourceFile.addImportDeclaration({
      moduleSpecifier: fromModule,
      namedImports: R.uniq([...namedImports, ...existingNamedImports]).sort(),
    })
  }

  addSyntaxToMethod(className: string, methodName: string, syntax: string) {
    const syntaxList = this.sourceFile
      .getClass(className)
      .getMethod(methodName)
      .getBody()
      .getChildSyntaxList()

    if (syntaxList.getText().indexOf(syntax) < 0) {
      syntaxList.addChildText(syntax)
    }
  }

  wrapJsxTag(className: string, methodName: string, jsxWrapperName: string) {
    const { sourceFile } = this
    const method = sourceFile.getClass(className).getMethod(methodName)
    const methodReturn = method.getBody().getFirstDescendantByKind(SyntaxKind.ReturnStatement)

    const parents = []
    let target = ''
    methodReturn.forEachDescendant(c => {
      if (c.getKind() === SyntaxKind.JsxOpeningElement) {
        parents.push({
          open: c.getText(),
          close: `</${c.getChildAtIndex(1).getText()}>`,
        })
      } else if (c.getKind() === SyntaxKind.JsxSelfClosingElement) {
        target = c.getText()
      }
    })

    if (!parents.find(p => p.close === `</${jsxWrapperName}>`)) {
      parents.push({
        open: `<${jsxWrapperName}>`,
        close: `</${jsxWrapperName}>`,
      })
    }

    let results = ''
    parents.forEach(p => {
      results += p.open
    })
    results += target

    R.reverse(parents).forEach(p => {
      results += p.close
    })

    methodReturn.replaceWithText('return ' + results)
  }

  sortImports() {
    const { sourceFile } = this
    const declarations = sourceFile.getImportDeclarations()
    const imports = declarations.map(i => {
      const from = i.getModuleSpecifier().getLiteralValue()
      const order = from[0] !== '.' ? 0 : 1
      const impor = i.getImportClause().getText()
      const value = i.getStructure()
      i.remove()
      return {
        impor,
        from,
        order,
        value,
      }
    })

    const { ascend, prop, sortWith } = R
    const doSort = sortWith<any>([
      ascend(prop('order')),
      ascend(prop('from')),
      ascend(prop('impor')),
    ])
    const orderedImports = doSort(imports)

    sourceFile.addImportDeclarations(orderedImports.map(i => i.value))
  }

  createOrUpdateInterface(
    name: string,
    properties: PropertySignatureStructure[],
    isExported: boolean = true,
  ) {
    let { sourceFile } = this
    if (!sourceFile) {
      sourceFile = this.project.createSourceFile(this.filepath)
    } else {
      let propsInterface = sourceFile.getInterface(name)
      if (!propsInterface) {
        propsInterface = sourceFile.addInterface({
          name,
          properties,
        })
      } else {
        properties.forEach(p => {
          if (!propsInterface.getProperty(p.name)) {
            propsInterface.addProperty(p)
          }
        })
      }
      propsInterface.setIsExported(isExported)
    }

    this.sourceFile = sourceFile

    return this
  }

  extendsInterface(name: string, extendsTo: string[], isPartial: boolean, fromModule?: string) {
    if (fromModule) {
      this.addNamedImports(fromModule, extendsTo)
      this.sortImports()
    }

    const intf = this.sourceFile.getInterface(name)
    extendsTo.forEach(e => {
      const eStr = isPartial ? `Partial<${e}>` : e
      if (
        intf
          .getExtends()
          .map(e => e.getText())
          .indexOf(eStr) < 0
      ) {
        intf.addExtends(eStr)
      }
    })

    return this
  }

  save() {
    const { utils } = this.context
    utils.prettify(this.sourceFile.getFilePath(), this.sourceFile.getText())
  }
}
