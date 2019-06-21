import * as path from 'path'
import {
  ArrayBindingElement,
  ArrowFunction,
  CallExpression,
  ClassDeclaration,
  ConstructorDeclaration,
  ExpressionWithTypeArguments,
  FunctionDeclaration,
  InterfaceDeclaration,
  Project,
  SourceFile,
  Statement,
  SyntaxKind,
  VariableStatement
} from 'ts-morph'
import { RootContext } from '../../libs'
import { FieldObject, KeyValue, NameValue } from '../types'
import { ViewTypeEnum } from '../views/types'
import { TsUtils } from './ts'

export class ReactUtils {
  context: RootContext
  tsUtils: TsUtils

  constructor(context: RootContext) {
    this.context = context
    this.tsUtils = new TsUtils(context)
  }

  /**
   * Create props interface declaration
   * @param project Project
   * @param baseName name
   * @param dir directory
   * @param fields fields
   */
  createPropsInterface(
    project: Project,
    baseName: string,
    dir: string,
    fields: FieldObject[]
  ): InterfaceDeclaration {
    const {
      naming: { props }
    } = this.context
    return this.tsUtils.createInterface(
      project,
      props(baseName),
      path.join(dir, 'props.ts'),
      fields
    )
  }

  /**
   * Create state interface declaration
   * @param project Project
   * @param baseName name
   * @param dir directory
   * @param fields fields
   */
  createStateInterface(
    project: Project,
    baseName: string,
    dir: string,
    fields: FieldObject[]
  ): InterfaceDeclaration {
    const {
      naming: { state }
    } = this.context
    return this.tsUtils.createInterface(
      project,
      state(baseName),
      path.join(dir, 'state.ts'),
      fields
    )
  }

  getHooks(fn: FunctionDeclaration | ArrowFunction): HookInfo[] {
    return this.getHooksExpressions(fn)
      .map(ce => {
        const stateArgs = ce.getArguments()
        let initial = ''
        if (stateArgs && stateArgs.length) {
          initial = stateArgs[0].getText()
        }

        let name = ''

        const arrayBindings = ce
          .getFirstAncestor()
          .getChildAtIndex(0) as ArrayBindingElement
        if (arrayBindings) {
          name = arrayBindings
            .getChildAtIndex(1)
            .getText()
            .split(',')[0]
            .trim()
        }

        return {
          name,
          initial,
          callExpression: ce
        }
      })
      .filter(ce => !!ce)
  }

  getHooksExpressions(
    fn: FunctionDeclaration | ArrowFunction
  ): CallExpression[] {
    return fn
      .getVariableDeclarations()
      .map(s => {
        const ce = s.getFirstDescendantByKind(SyntaxKind.CallExpression)
        if (ce && ce.getText().startsWith('useState(')) {
          return ce
        }
        return undefined
      })
      .filter(ce => !!ce)
  }

  getReactViewInfo(sourceFile: SourceFile): ReactComponentInfo {
    let info: ReactComponentInfo
    info = this.tryGetReactClassInfo(sourceFile)
    if (!info) {
      info = this.tryGetReactFunctionInfo(sourceFile)
    }
    if (!info) {
      info = this.tryGetReactArrowFunctionInfo(sourceFile)
    }

    return info
  }

  tryGetReactClassInfo(sourceFile: SourceFile): ReactComponentInfo {
    let reactExtends
    const clazz: ClassDeclaration = sourceFile.getClasses().find(c => {
      reactExtends = c.getExtends()
      const matches =
        reactExtends &&
        reactExtends.getText().match(/React.Component|Component/g)
      return matches && matches.length
    })

    if (!clazz) {
      return undefined
    }

    return {
      name: clazz.getName(),
      type: ViewTypeEnum.classComponent
    }
  }

  tryGetReactFunctionInfo(sourceFile: SourceFile): ReactComponentInfo {
    let func = sourceFile.getFunctions().find(f => f.isExported())
    if (func) {
      return {
        name: func.getName(),
        type: ViewTypeEnum.functionComponent
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
      type: ViewTypeEnum.functionComponent
    }
  }

  tryGetReactArrowFunctionInfo(sourceFile: SourceFile): ReactComponentInfo {
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
      type: ViewTypeEnum.arrowFunctionComponent
    }
  }

  /**
   * Get props and state interface name from class view declaration
   * @param classView class view declaration
   */
  getViewPropsAndStateName(classView: ClassDeclaration) {
    const reactExtends = classView.getExtends()
    if (!reactExtends) {
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
      props,
      state
    }
  }

  getViewPropsNameFromFunction(
    functionView: FunctionDeclaration | ArrowFunction
  ) {
    const params = functionView.getParameters()
    let props: string | undefined
    if (params.length) {
      const paramNode = params[0].getTypeNode()
      if (paramNode) {
        props = paramNode.getText()
      }
    }
    return props
  }

  setReactExtendsGeneric(viewClass: ClassDeclaration, { props, state }) {
    const rExtends = this.getReactExtends(viewClass)

    let react = 'React.Component'
    let reactExtends: ExpressionWithTypeArguments

    if (rExtends) {
      ;({ react, reactExtends } = rExtends)

      if (!props) {
        props = rExtends.info.props
      }

      if (!state) {
        state = rExtends.info.state
      }

      if (state && !props) {
        props = 'any'
      }
    }

    const str = state ? `${react}<${props}, ${state}>` : `${react}<${props}>`

    if (reactExtends) {
      reactExtends.replaceWithText(str)
    } else {
      viewClass.setExtends(str)
    }
  }

  /**
   * Import props to class view and update heritage clause and constructor
   * @param viewClass class view
   * @param propsInterface props interface declaration
   */
  addPropsReferenceToClassView(
    viewClass: ClassDeclaration,
    propsInterface: InterfaceDeclaration
  ) {
    const propsName = propsInterface.getName()

    this.setReactExtendsGeneric(viewClass, { props: propsName, state: null })

    // ensure constructor is exists
    let constr = this.getClassConstructor(viewClass)
    if (!constr) {
      constr = this.addClassConstructor(viewClass, propsName)
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
    this.tsUtils.addImportInterfaceDeclaration(viewFile, propsInterface)
  }

  /**
   * Import props and add props parameter to view function
   * @param viewFunction view function declaration
   * @param propsInterface props interface declaration
   */
  addPropsReferenceToFunctionView(
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
    this.tsUtils.addImportInterfaceDeclaration(viewFile, propsInterface)
  }

  /**
   * Import props and add props parameter to view function
   * @param varStatement view variable statement
   * @param propsInterface props interface declaration
   */
  addPropsReferenceToArrowFunctionView(
    varStatement: VariableStatement,
    propsInterface: InterfaceDeclaration
  ) {
    // get declaration
    const declaration = varStatement.getFirstDescendantByKind(
      SyntaxKind.VariableDeclaration
    )

    // ensure type node declaration is correct
    const typeNodeStr = `React.FC<${propsInterface.getName()}>`
    declaration.setType(typeNodeStr)

    // add reference to function
    const viewFunction = declaration.getFirstDescendantByKind(
      SyntaxKind.ArrowFunction
    )
    this.addPropsReferenceToFunctionView(viewFunction, propsInterface)
  }

  /**
   * Import state and set initializer to view class
   * @param viewClass view class
   * @param stateInterface state interface declaration
   * @param fields fields to set initializer
   */
  addStateReferenceToClassView(
    viewClass: ClassDeclaration,
    stateInterface: InterfaceDeclaration,
    fields: FieldObject[]
  ) {
    let constr = this.getClassConstructor(viewClass)
    if (!constr) {
      constr = this.addClassConstructor(viewClass)
    }

    const stmt = this.getStateStatement(constr)
    if (stmt) {
      stmt.remove()
    }

    // add import state
    this.tsUtils.addImportInterfaceDeclaration(
      viewClass.getSourceFile(),
      stateInterface
    )

    // set react extends generic statement
    this.setReactExtendsGeneric(viewClass, {
      props: null,
      state: stateInterface.getName()
    })

    // set initializer
    const stmtStr = this.tsUtils.createObjectInitializerStatement(fields)
    constr.addStatements(`this.state = ${stmtStr}`)
  }

  setHooks(fn: FunctionDeclaration | ArrowFunction, fields: FieldObject[]) {
    fn.getSourceFile().addImportDeclaration({
      moduleSpecifier: 'react',
      namedImports: ['useState']
    })
    const idx = this.clearHooks(fn)
    fn.insertStatements(idx, this.createHooksStatements(fields))
  }

  clearHooks(fn: FunctionDeclaration | ArrowFunction) {
    let idx = -1
    for (const ce of this.getHooksExpressions(fn)) {
      const stmt = ce
        .getParent()
        .getParent()
        .getParent() as VariableStatement

      if (idx < 0) {
        idx = stmt.getChildIndex()
      }
      stmt.remove()
    }

    return idx
  }

  /**
   * Build react hooks statement
   * @param fields state fields
   */
  createHooksStatements(fields: FieldObject[]): string {
    const {
      strings: { pascalCase, camelCase }
    } = this.context
    let str = ''
    for (const field of fields) {
      str += `const [ ${camelCase(field.name)}, set${pascalCase(
        field.name
      )} ] = useState(${field.initial || ''})\r\n`
    }

    return str
  }

  getStateStatement(constr: ConstructorDeclaration): Statement {
    return constr.getStatement(f => !!f.getText().match(/this.state\s*?=/g))
  }

  getStateInitializer(constr: ConstructorDeclaration): KeyValue {
    const stmt = this.getStateStatement(constr)
    if (!stmt) {
      return {}
    }

    return stmt
      .getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression)
      .getProperties()
      .map<NameValue>(p => ({
        name: p.getChildAtIndex(0).getText(),
        value: p.getChildAtIndex(2).getText()
      }))
      .reduce<KeyValue>((acc, curr) => {
        acc[curr.name] = curr.value
        return acc
      }, {})
  }

  getClassConstructor(clazz: ClassDeclaration): ConstructorDeclaration {
    const constructors = clazz.getConstructors()
    if (!constructors.length) {
      return undefined
    }

    return constructors.length === 1
      ? constructors[0]
      : constructors.find(c => {
          const r = c.getBodyText().match(/super\s*?\(/g)
          return r && r.length > 0
        })
  }

  addClassConstructor(
    clazz: ClassDeclaration,
    propsType: string = 'any'
  ): ConstructorDeclaration {
    return clazz.insertConstructor(0, {
      parameters: [{ name: 'props', type: propsType }],
      statements: 'super(props);'
    })
  }

  getReactExtends(viewClass: ClassDeclaration) {
    const reactExtends = viewClass.getExtends()
    const matches = reactExtends.getText().match(/React.Component|Component/g)
    if (!matches) {
      return undefined
    }

    const args = reactExtends.getNodeProperty('typeArguments') || []
    const info = {
      props: args.length > 0 ? args[0].getText() : undefined,
      state: args.length > 1 ? args[1].getText() : undefined
    }
    return { react: matches[0], info, reactExtends }
  }
}

export interface ReactComponentInfo {
  name: string
  type: ViewTypeEnum
}

export interface HookInfo {
  name: string
  initial: string
  callExpression: CallExpression
}
