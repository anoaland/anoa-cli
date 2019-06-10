import * as path from 'path'
import {
  ArrowFunction,
  CallExpression,
  ClassDeclaration,
  ConstructorDeclaration,
  FunctionDeclaration,
  InterfaceDeclaration,
  ParameterDeclaration,
  Project,
  PropertySignatureStructure,
  SourceFile,
  StructureKind,
  SyntaxKind,
  VariableStatement
} from 'ts-morph'
import { RootContext } from '../../libs'
import { ViewTypeEnum } from '../views/enums'
import { FieldObject } from './object-builder'

export class ReactUtils {
  static getConstructorFromClass(clazz: ClassDeclaration) {
    const constructors = clazz.getConstructors()
    return constructors.length === 1
      ? constructors[0]
      : constructors.find(c => {
          const r = c.getBodyText().match(/super\s*?\(/g)
          return r && r.length > 0
        })
  }

  static addConstructorToClass(
    clazz: ClassDeclaration,
    propsType: string = 'any'
  ) {
    return clazz.insertConstructor(0, {
      parameters: [{ name: 'props', type: propsType }],
      statements: 'super(props);'
    })
  }

  static getStateInitializer(constr: ConstructorDeclaration) {
    const stateStatement = this.getStateStatement(constr)

    if (stateStatement) {
      return stateStatement
        .getChildren()[0]
        .getFirstChildByKind(SyntaxKind.ObjectLiteralExpression)
        .getProperties()
        .map(p => ({
          [p.getChildAtIndex(0).getText()]: p.getChildAtIndex(2).getText()
        }))
        .reduce((f, v) => ({ ...f, ...v }))
    }

    return {}
  }

  static replaceStateInitializer(
    constr: ConstructorDeclaration,
    fields: FieldObject[]
  ) {
    const stateStatement = this.getStateStatement(constr)
    if (stateStatement) {
      stateStatement.remove()
    }

    this.setStateInitializer(constr, fields)
  }

  static setStateInitializer(
    constr: ConstructorDeclaration,
    fields: FieldObject[]
  ) {
    constr.addStatements(this.buildStateInitializerBodyText(fields))
  }

  static replaceStateProperties(
    stateInterface: InterfaceDeclaration,
    fields: FieldObject[]
  ) {
    const newProps = fields.map<PropertySignatureStructure>(p => {
      return {
        name: p.name,
        type: p.type,
        optional: p.optional,
        hasQuestionToken: p.optional,
        kind: StructureKind.PropertySignature
      }
    })

    const existingProps = stateInterface.getProperties()
    for (const p of existingProps) {
      const newProp = newProps.find(f => f.name === p.getName())
      if (newProp) {
        p.set(newProp)
        newProps.splice(newProps.indexOf(newProp), 1)
      } else {
        p.remove()
      }
    }

    if (!newProps.length) {
      return
    }

    stateInterface.addProperties(newProps)
  }

  static buildStateInitializerBodyText(fields: FieldObject[]) {
    const stateInit = fields.length
      ? fields
          .filter(p => !p.optional || p.initial)
          .map(p => `${p.name}: ${p.initial}`)
          .join(',')
      : ''

    return `this.state = {${stateInit}}`
  }

  static getStateStatement(constr: ConstructorDeclaration) {
    return constr.getStatement(f => !!f.getText().match(/this.state\s*?=/g))
  }

  static addStateReference(viewClass: ClassDeclaration, stateName: string) {
    const { info, react, reactExtends } = this.getReactExtends(viewClass)

    const props = info.props || 'any'
    const str = `${react}<${props}, ${stateName}>`
    reactExtends.replaceWithText(str)

    viewClass.getSourceFile().addImportDeclaration({
      namedImports: [stateName],
      moduleSpecifier: './state'
    })
  }

  static getInterfaceFields(intrfc: InterfaceDeclaration) {
    return intrfc.getProperties().map<FieldObject>(m => {
      return {
        name: m.getName(),
        type: m.getTypeNode().getText(),
        optional: m.hasQuestionToken()
      }
    })
  }

  static getReactClassInfo(sourceFile: SourceFile): ReactComponentInfo {
    let reactExtends
    const clazz: ClassDeclaration = sourceFile.getClasses().find(c => {
      reactExtends = c.getExtends()
      const matches = reactExtends.getText().match(/React.Component|Component/g)
      return matches && matches.length
    })

    if (!clazz) {
      return undefined
    }

    const args = reactExtends.getTypeArguments()
    let props: string | undefined
    let state: string | undefined

    if (args) {
      if (args.length > 0) {
        props = args[0].getText()
      }

      if (args.length > 1) {
        state = args[1].getText()
      }
    }

    return {
      name: clazz.getName(),
      props,
      state,
      type: ViewTypeEnum.classBased
    }
  }

  static getReactFunctionInfo(sourceFile: SourceFile): ReactComponentInfo {
    let func = sourceFile.getFunctions().find(f => f.isExported())
    if (func) {
      return {
        name: func.getName(),
        type: ViewTypeEnum.stateless,
        props: this.getPropsTypeFromParams(func.getParameters())
      }
    }

    let fnRealName: string
    const varStmt = sourceFile.getVariableDeclarations().find(v => {
      if (!v.isExported()) {
        return false
      }

      const initializer = v.getInitializer() as CallExpression

      if (!initializer || !initializer.getArguments) {
        return false
      }

      const args = initializer.getArguments()
      if (!args.length) {
        return false
      }

      fnRealName = args[0].getText()
      return true
    })

    if (!varStmt) {
      return undefined
    }

    func = sourceFile.getFunction(fnRealName)
    if (!func) {
      return undefined
    }

    return {
      name: varStmt.getName(),
      type: ViewTypeEnum.stateless,
      props: this.getPropsTypeFromParams(func.getParameters())
    }
  }

  static getReactArrowFunctionInfo(sourceFile: SourceFile): ReactComponentInfo {
    let arrowFn: ArrowFunction
    const declaration = sourceFile.getVariableDeclarations().find(v => {
      if (!v.isExported()) {
        return false
      }
      arrowFn = v.getFirstDescendantByKind(SyntaxKind.ArrowFunction)
      return !!arrowFn
    })

    return {
      name: declaration.getName(),
      type: ViewTypeEnum.statelessFunctional,
      props: this.getPropsTypeFromParams(arrowFn.getParameters())
    }
  }

  static getPropsTypeFromParams(params: ParameterDeclaration[]) {
    let props: string | undefined
    if (params.length) {
      const paramNode = params[0].getTypeNode()
      if (paramNode) {
        props = paramNode.getText()
      }
    }
    return props
  }

  static addPropsReferenceToClassView(
    viewClass: ClassDeclaration,
    propsInterface: InterfaceDeclaration
  ) {
    const propsName = propsInterface.getName()

    // ensure heritage clause
    const { info, react, reactExtends } = this.getReactExtends(viewClass)
    const str = info.state
      ? `${react}<${propsName}, ${info.state}>`
      : `${react}<${propsName}>`
    reactExtends.replaceWithText(str)

    // ensure constructor is exists

    let constr = this.getConstructorFromClass(viewClass)
    if (!constr) {
      constr = this.addConstructorToClass(viewClass, propsName)
    }

    const constParams = constr.getParameters()
    if (!constParams.length) {
      constr.addParameter({
        name: 'props',
        type: propsName
      })
    }

    // ensure props is imported
    const viewFile = viewClass.getSourceFile()
    this.addImportInterfaceDeclaration(viewFile, propsInterface)
  }

  static getReactExtends(viewClass: ClassDeclaration) {
    const reactExtends = viewClass.getExtends()
    const matches = reactExtends.getText().match(/React.Component|Component/g)
    if (!matches) {
      throw new Error('Invalid React class component.')
    }
    const args = reactExtends.getNodeProperty('typeArguments') || []
    const info = {
      props: args.length > 0 ? args[0].getText() : undefined,
      state: args.length > 1 ? args[1].getText() : undefined
    }
    return { react: matches[0], info, reactExtends }
  }

  static addPropsReferenceToStatelessView(
    viewFunction: FunctionDeclaration | ArrowFunction,
    propsInterface: InterfaceDeclaration
  ) {
    const propsName = propsInterface.getName()
    const fnParams = viewFunction.getParameters()
    if (!fnParams.length) {
      viewFunction.addParameter({
        name: 'props',
        type: propsName
      })
    }

    // ensure props is imported
    const viewFile = viewFunction.getSourceFile()
    this.addImportInterfaceDeclaration(viewFile, propsInterface)
  }

  static addPropsReferenceToStatelessFunctionalView(
    varStatement: VariableStatement,
    propsInterface: InterfaceDeclaration
  ) {
    // get declaration
    const declaration = varStatement.getFirstDescendantByKind(
      SyntaxKind.VariableDeclaration
    )

    // ensure type node declaration is correct
    const typeNodeStr = `React.SFC<${propsInterface.getName()}>`
    declaration.setType(typeNodeStr)

    // add reference to function
    const viewFunction = declaration.getFirstDescendantByKind(
      SyntaxKind.ArrowFunction
    )
    this.addPropsReferenceToStatelessView(viewFunction, propsInterface)
  }

  static addClassDecorator(
    viewClass: ClassDeclaration,
    name: string,
    args: string[]
  ) {
    const existingDecorator = viewClass.getDecorator(name)
    if (existingDecorator) {
      // replace arguments
      const existingArgs = existingDecorator.getArguments()
      for (const arg of existingArgs) {
        existingDecorator.removeArgument(arg)
      }
      existingDecorator.addArguments(args)
    } else {
      // add new decorator
      viewClass.addDecorator({
        name,
        arguments: args
      })
    }
  }

  /**
   * Add interface import declaration if not exists.
   * @param viewFile view source file
   * @param intrfc interface declaration
   */
  static addImportInterfaceDeclaration(
    viewFile: SourceFile,
    intrfc: InterfaceDeclaration
  ) {
    const modulePath = intrfc.getSourceFile().getFilePath()
    const namedImport = intrfc.getName()

    ReactUtils.addNamedImport(viewFile, modulePath, namedImport)
  }

  /**
   * Add named import if not exists.
   * @param viewFile view source file
   * @param modulePath module path
   * @param namedImport named import
   */
  static addNamedImport(
    viewFile: SourceFile,
    modulePath: string,
    namedImport: string
  ) {
    const moduleSpecifier = this.fixImportPath(
      path.relative(path.dirname(viewFile.getFilePath()), modulePath)
    )
    const existingImport = viewFile
      .getImportDeclarations()
      .find(i => i.getModuleSpecifierValue() === moduleSpecifier)
    if (existingImport) {
      if (
        !existingImport.getNamedImports().find(n => n.getText() === namedImport)
      ) {
        existingImport.addNamedImport(namedImport)
      }
    } else {
      viewFile.addImportDeclaration({
        namedImports: [namedImport],
        moduleSpecifier
      })
    }
  }

  static fixImportPath(modulePath: string) {
    if (!modulePath.startsWith('.')) {
      modulePath = './' + modulePath
    }

    return modulePath
      .replace(/\\/g, '/')
      .replace(/\.ts$|.tsx$|index.tsx$|index.ts$/g, '')
      .replace(/\/$/g, '')
  }

  static getNamedImport(sourceFile: SourceFile, match: any) {
    const actionImport = sourceFile.getImportDeclaration(
      i =>
        !!i
          .getModuleSpecifier()
          .getText()
          .match(match)
    )

    return actionImport.getNamedImports()[0].getText()
  }

  static getSourceFileInSameFolder(
    context: RootContext,
    project: Project,
    folder: string,
    fileName: string
  ): SourceFile | undefined {
    const {
      filesystem: { exists }
    } = context
    const actionTypesPath = path.join(folder, fileName)
    if (!exists(actionTypesPath)) {
      return undefined
    }

    return project.addExistingSourceFile(actionTypesPath)
  }

  static getOrAddInterface(
    sourceFile: SourceFile,
    interfaceName: string,
    isExported: boolean = true
  ) {
    return (
      sourceFile.getInterface(interfaceName) ||
      sourceFile.addInterface({ name: interfaceName, isExported })
    )
  }

  static extendsInterface(intrfc: InterfaceDeclaration, extendsTo: string) {
    if (!intrfc.getExtends().find(e => e.getText() === extendsTo)) {
      intrfc.addExtends(extendsTo)
    }
  }
}

export interface ReactComponentInfo {
  name: string
  props?: string
  state?: string
  type: ViewTypeEnum
}
