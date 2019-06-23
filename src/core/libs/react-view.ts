import * as path from 'path'
import { Project, SourceFile, SyntaxKind } from 'ts-morph'
import { ReactComponentInfo } from '../tools/react'
import {
  FieldObject,
  PropsInfo,
  RootContext,
  StateInfo,
  ViewKindEnum,
  ViewTypeEnum
} from '../types'

export class ReactView {
  context: RootContext
  sourceFile: SourceFile
  name: string
  type: ViewTypeEnum
  kind: ViewKindEnum
  key: string

  constructor(
    context: RootContext,
    sourceFile: SourceFile,
    kind: ViewKindEnum,
    info: ReactComponentInfo
  ) {
    this.context = context
    this.sourceFile = sourceFile
    this.name = info.name
    this.kind = kind
    this.type = info.type
    this.key = this.getKey()
  }

  addToProject(project: Project) {
    this.sourceFile = project.addExistingSourceFile(
      this.sourceFile.getFilePath()
    )
    return this.sourceFile
  }

  getFilePath() {
    const { folder } = this.context
    return path
      .relative(
        this.kind === ViewKindEnum.component
          ? folder.components()
          : folder.screens(),
        this.sourceFile.getFilePath()
      )
      .replace(/\\/g, '/')
  }

  getPropsName() {
    const { tools } = this.context
    const react = tools.react()

    switch (this.type) {
      case ViewTypeEnum.classComponent:
        const classPropsAndState = react.getViewPropsAndStateName(
          this.getClass()
        )
        if (!classPropsAndState) {
          return undefined
        }
        return classPropsAndState.props

      case ViewTypeEnum.functionComponent:
        const fn = this.getFunction()
        if (!fn) {
          return undefined
        }

        return react.getViewPropsNameFromFunction(fn)

      case ViewTypeEnum.arrowFunctionComponent:
        const arrowFn = this.getArrowFunction()
        if (!arrowFn) {
          return undefined
        }
        return react.getViewPropsNameFromFunction(arrowFn)
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

  getProps(): PropsInfo {
    const {
      filesystem: { exists },
      tools
    } = this.context

    const propsName = this.getPropsName()

    if (!propsName) {
      return undefined
    }

    const propsPath = path.join(this.sourceFile.getDirectoryPath(), 'props.ts')
    if (!exists(propsPath)) {
      return undefined
    }

    const project = new Project()
    const propsFile = project.addExistingSourceFile(propsPath)
    const propsInterface = propsFile.getInterface(propsName)
    if (!propsInterface) {
      return undefined
    }

    const ts = tools.ts()
    return {
      name: propsName,
      sourceFile: propsFile,
      fields: ts.getInterfaceFields(propsInterface)
    }
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

  private getKey() {
    const {
      strings: { padEnd },
      print: { colors }
    } = this.context
    return `  ${padEnd(this.name, 25)} ${colors.yellow(
      `[${this.getFilePath()}]`
    )}`
  }
}
