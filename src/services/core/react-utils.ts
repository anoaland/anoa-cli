import * as path from 'path'
import {
  ArrowFunction,
  ClassDeclaration,
  ConstructorDeclaration,
  FunctionDeclaration,
  InterfaceDeclaration,
  ParameterDeclaration,
  PropertySignatureStructure,
  SourceFile,
  SyntaxKind,
  VariableStatement
} from 'ts-morph'
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
      bodyText: 'super(props);'
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
        hasQuestionToken: p.optional
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

  static getReactClassInfo(clazz: ClassDeclaration): ReactComponentInfo {
    const reactExtends = clazz.getExtends()
    const matches = reactExtends.getText().match(/React.Component|Component/g)
    if (!matches || !matches.length) {
      return undefined
    }

    const args = reactExtends.getNodeProperty('typeArguments')
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

  static getReactFunctionInfo(func: FunctionDeclaration): ReactComponentInfo {
    if (!func.isExported()) {
      return undefined
    }

    return {
      name: func.getName(),
      type: ViewTypeEnum.stateless,
      props: this.getPropsTypeFromParams(func.getParameters())
    }
  }

  static getReactArrowFunctionInfo(vs: VariableStatement): ReactComponentInfo {
    const declarations = vs.getNodeProperty('declarationList')
    if (!declarations) {
      return undefined
    }

    if (!vs.isExported()) {
      return undefined
    }

    const declaration = declarations.getFirstDescendantByKind(
      SyntaxKind.VariableDeclaration
    )

    if (!declaration) {
      return undefined
    }

    const arrowFn = declaration.getFirstDescendantByKind(
      SyntaxKind.ArrowFunction
    )

    if (!arrowFn) {
      return undefined
    }

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
    this.addImportPropsDeclaration(viewFile, propsInterface)
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
    this.addImportPropsDeclaration(viewFile, propsInterface)
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

  static addImportPropsDeclaration(
    viewFile: SourceFile,
    propsInterface: InterfaceDeclaration
  ) {
    const moduleSpecifier = this.fixImportPath(
      path.relative(
        viewFile.getFilePath(),
        propsInterface.getSourceFile().getFilePath()
      )
    )

    viewFile.addImportDeclaration({
      namedImports: [propsInterface.getName()],
      moduleSpecifier
    })
  }

  static fixImportPath(modulePath: string) {
    if (modulePath.startsWith('..')) {
      modulePath = modulePath.replace('..', '.')
    }

    return modulePath.replace(/\\/g, '/').replace(/\.ts|.tsx/g, '')
  }
}

export interface ReactComponentInfo {
  name: string
  props?: string
  state?: string
  type: ViewTypeEnum
}