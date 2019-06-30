import * as path from 'path'
import {
  ArrowFunction,
  CallExpression,
  Decorator,
  DecoratorStructure,
  InterfaceDeclaration,
  OptionalKind,
  Project,
  SourceFile,
  SyntaxKind
} from 'ts-morph'
import { ReactComponentInfo } from '../tools/react'
import {
  FieldObject,
  KeyValue,
  RootContext,
  StateInfo,
  ViewKindEnum,
  ViewTypeEnum
} from '../types'
import { Lib } from './lib'
import { ViewProps } from './view-props'

export class ReactView extends Lib {
  name: string
  type: ViewTypeEnum
  kind: ViewKindEnum
  key: string

  private cache: KeyValue<any> = {}

  constructor(
    context: RootContext,
    sourceFile: SourceFile,
    kind: ViewKindEnum,
    info: ReactComponentInfo
  ) {
    super(context)
    this.context = context
    this.sourceFile = sourceFile
    this.name = info.name
    this.kind = kind
    this.type = info.type
    this.key = this.getKey()
  }

  /**
   * Import if not exists
   * @param modulePath module path
   * @param moduleName module name
   */
  addNamedImport(modulePath: string, moduleName: string) {
    this.context.tools
      .ts()
      .addNamedImport(this.sourceFile, modulePath, moduleName)
  }

  sortFilePath(): string {
    if (this.cache.filePath) {
      return this.cache.filePath
    }
    const { folder } = this.context
    return (this.cache.filePath = path
      .relative(
        this.kind === ViewKindEnum.component
          ? folder.components()
          : folder.screens(),
        this.sourceFile.getFilePath()
      )
      .replace(/\\/g, '/'))
  }

  getProps(): ViewProps {
    if (this.cache.props !== undefined) {
      return this.cache.props
    }

    const {
      filesystem: { exists },
      tools,
      naming
    } = this.context

    const propsPath = path.join(this.sourceFile.getDirectoryPath(), 'props.ts')
    if (!exists(propsPath)) {
      return null
    }

    const { project } = tools.source()
    const react = tools.react()
    const propsFile = project.addExistingSourceFile(propsPath)

    let propsInterface: InterfaceDeclaration
    let propsName = ''

    // try to get props name from declared generic parameters
    switch (this.type) {
      case ViewTypeEnum.classComponent:
        const classPropsAndState = react.getViewPropsAndStateName(
          this.getClass()
        )
        if (!classPropsAndState) {
          return undefined
        }
        propsName = classPropsAndState.props
        break

      case ViewTypeEnum.functionComponent:
        const fn = this.getFunction()
        if (!fn) {
          return undefined
        }

        propsName = react.getViewPropsNameFromFunction(fn)
        break

      case ViewTypeEnum.arrowFunctionComponent:
        const arrowFn = this.getArrowFunction()
        if (!arrowFn) {
          return undefined
        }
        propsName = react.getViewPropsNameFromFunction(arrowFn)
    }

    if (!propsName) {
      // props name is not declared try guess it
      propsInterface = propsFile.getInterface(naming.props(this.name))
      if (!propsInterface) {
        const interfaces = propsFile.getInterfaces().filter(i => i.isExported())
        if (interfaces.length === 1) {
          propsInterface = interfaces[0]
        }
      }
      if (propsInterface) {
        propsName = propsInterface.getName()
      }
    } else {
      propsInterface = propsFile.getInterface(propsName)
    }

    if (!propsInterface) {
      project.removeSourceFile(propsFile)
      return null
    }

    const ts = tools.ts()
    return (this.cache.props = new ViewProps(this.context, this, {
      name: propsName,
      sourceFile: propsFile,
      fields: ts.getInterfaceFields(propsInterface)
    }))
  }

  createProps(fields: FieldObject[] = []): ViewProps {
    const {
      naming,
      filesystem: { exists },
      tools
    } = this.context

    const propsName = naming.props(this.name)

    const propsPath = path.join(this.sourceFile.getDirectoryPath(), 'props.ts')
    if (exists(propsPath)) {
      throw new Error(`props ${propsName} is already exists on ${propsPath}`)
    }

    const ts = tools.ts()

    const { project } = tools.source()
    const propsInterface = ts.createInterface(
      project,
      propsName,
      propsPath,
      fields
    )

    ts.addImportInterfaceDeclaration(this.sourceFile, propsInterface)

    return (this.cache.props = new ViewProps(this.context, this, {
      name: propsName,
      sourceFile: propsInterface.getSourceFile(),
      fields
    }))
  }

  getOrCreateProps(fields: FieldObject[] = []): ViewProps {
    return this.getProps() || this.createProps(fields)
  }

  getState(): StateInfo {
    const isHooks = this.type !== ViewTypeEnum.classComponent
    const {
      filesystem: { exists },
      tools
    } = this.context

    const react = tools.react()

    if (!isHooks) {
      const stateName = react.getViewPropsAndStateName(this.getClass()).state
      if (!stateName) {
        return undefined
      }

      const statePath = path.join(
        this.sourceFile.getDirectoryPath(),
        'state.ts'
      )
      if (!exists(statePath)) {
        return undefined
      }

      const project = new Project()
      const stateFile = project.addExistingSourceFile(statePath)
      const stateInterface = stateFile.getInterface(stateName)
      if (!stateInterface) {
        return undefined
      }

      const initializer = react.getStateInitializer(
        react.getClassConstructor(this.getClass())
      )

      const ts = tools.ts()
      const fields = ts.getInterfaceFields(stateInterface)
      for (const field of fields) {
        field.initial = initializer[field.name]
      }

      return {
        isHook: false,
        name: stateName,
        sourceFile: stateFile,
        fields
      }
    } else {
      const fn =
        this.type === ViewTypeEnum.functionComponent
          ? this.getFunction()
          : this.getArrowFunction()

      const fields: FieldObject[] = []

      for (const { name, initial } of react.getHooks(fn)) {
        fields.push({
          name,
          initial,
          optional: false,
          type: ''
        })
      }

      if (!fields.length) {
        return undefined
      }

      return {
        isHook: true,
        fields
      }
    }
  }

  getClass() {
    return this.sourceFile.getClass(this.name)
  }

  getFunction() {
    let fn = this.sourceFile.getFunction(this.name)
    if (!fn) {
      const varDec = this.sourceFile.getVariableDeclaration(this.name)
      if (!varDec) {
        return undefined
      }

      const initializer = varDec.getInitializerIfKind(SyntaxKind.CallExpression)
      if (!initializer) {
        return undefined
      }

      const args = initializer.getArguments()
      if (!args.length) {
        return undefined
      }

      fn = this.sourceFile.getFunction(args[0].getText())
    }
    return fn
  }

  getArrowFunction() {
    const varDec = this.sourceFile.getVariableDeclaration(this.name)
    if (!varDec) {
      return undefined
    }
    return varDec.getFirstDescendantByKind(SyntaxKind.ArrowFunction)
  }

  /**
   * Get class decorator
   * @param key decorator key to find
   */
  getDecorator(key: string) {
    const clazz = this.getClass()
    if (!clazz) {
      throw new Error('Decorator can only applied to class view.')
    }

    return clazz.getDecorator(d => d.getFullName().startsWith(key))
  }

  /**
   * Add decorator and reference props to class
   * @param decorator decorator structure
   */
  addDecorator(decorator: OptionalKind<DecoratorStructure>) {
    const clazz = this.getClass()
    if (!clazz) {
      throw new Error('Decorator can only applied to class view.')
    }

    clazz.addDecorator(decorator)

    const { tools } = this.context

    const react = tools.react()
    const propsName = this.getProps().name

    // set React.Component extends generic
    react.setReactExtendsGeneric(clazz, {
      props: propsName,
      state: null
    })

    // ensure constructor
    react.getOrCreateClassConstructor(clazz, propsName)
  }

  /**
   * Set class decorator.
   * This will looks for decorator started with 'key' statement,
   * if found then replace execute onFoundExisting,
   * otherwise create a new one.
   * This will also reference 'props' type as generic parameter for
   * React.Component and ensure constructor is proper.
   * @param key decorator key to find
   * @param decorator decorator structure
   * @param onFoundExisting callback when found existing decorator
   */
  setDecorator(
    key: string,
    decorator: OptionalKind<DecoratorStructure>,
    onFoundExisting?: (decorator: Decorator) => void
  ): boolean {
    const clazz = this.getClass()
    if (!clazz) {
      throw new Error('Decorator can only applied to class view.')
    }

    const existing = this.getDecorator(key)
    if (existing) {
      if (onFoundExisting) {
        onFoundExisting(existing)
      } else {
        return false
      }
    }

    this.addDecorator(decorator)
    return true
  }

  /**
   * Set HOC to function/arrow-function component.
   * This will looks for HOC started with 'key' statement,
   * if found and 'force' parameter = true then replace the statement,
   * otherwise create a new one.
   * This will also reference 'props' parameter to function/arrow-function.
   * @param key statement key to find
   * @param statement statement
   * @param force force to replace HOC if found
   */
  setHoc(
    key: string,
    statement: (exp?: CallExpression) => string,
    force: boolean = false
  ) {
    const react = this.context.tools.react()
    const props = this.getProps()

    if (!props) {
      throw new Error(
        `Could not find props for ${
          this.name
        } component. HOC could not be applied here.\r\nNormally you want to extends props to other interface.`
      )
    }

    // prepare main component variable to wrap
    const viewVar = react.getOrCreateViewVarOfFunctionView(
      this.sourceFile,
      this.name,
      props.name
    )

    // get existing hoc
    const existingHocNode = viewVar.getFirstChild(
      c =>
        c.getKind() === SyntaxKind.CallExpression && c.getText().startsWith(key)
    )

    let hoc: CallExpression
    if (existingHocNode) {
      hoc = existingHocNode.getFirstChildByKind(SyntaxKind.CallExpression)
    }

    if (!hoc) {
      // get main component function
      const fn = viewVar.getInitializer() as ArrowFunction
      if (fn.getParameters) {
        // ensure has 'props' parameter
        react.setFunctionPropsParams(fn, props.name)
      }
      // wrap with hoc
      viewVar.replaceWithText(
        `${viewVar.getName()} = ${statement()}(${fn.getText()})`
      )
    } else {
      if (force) {
        // replace existing hoc statement
        hoc.replaceWithText(statement(hoc))
      } else {
        return false
      }
    }

    return true
  }

  private getKey() {
    const {
      strings: { padEnd },
      print: { colors }
    } = this.context
    return `  ${padEnd(this.name, 25)} ${colors.yellow(
      `[${this.sortFilePath()}]`
    )}`
  }
}
