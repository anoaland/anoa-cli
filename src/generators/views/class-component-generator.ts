import * as path from 'path'
import { Project } from 'ts-morph'
import { RootContext } from '../../core/types'
import {
  CreateComponentArgs,
  CreateComponentResult,
  ViewKindEnum
} from '../../core/types'

export class ClassComponentGenerator {
  context: RootContext

  constructor(context: RootContext) {
    this.context = context
  }

  async generate(args: CreateComponentArgs): Promise<CreateComponentResult> {
    const { naming, tools } = this.context

    const react = tools.react()
    const source = tools.source()
    const ts = tools.ts()

    // processing
    const project = new Project()

    const { location, props, state } = args
    const name =
      args.kind === ViewKindEnum.component
        ? naming.component(args.name)
        : naming.screen(args.name)

    // build view file
    const viewPath = path.join(location, 'index.tsx')
    const viewFile = project.createSourceFile(viewPath)

    let extendsStr: string = ''

    // build props as required
    const hasProps = props && props.length
    let propsName: string

    if (hasProps) {
      const propsInterface = react.createPropsInterface(
        project,
        name,
        location,
        props
      )
      propsName = propsInterface.getName()
      extendsStr = `<${propsName}`
      viewFile.addImportDeclaration({
        moduleSpecifier: './props',
        namedImports: [propsName]
      })
    }

    // build state as required
    const hasState = state && state.length
    if (hasState) {
      if (!extendsStr) {
        extendsStr = '<any'
      }

      const stateInterface = react.createStateInterface(
        project,
        name,
        location,
        state
      )

      const stateName = stateInterface.getName()
      extendsStr += `, ${stateName}>`
      viewFile.addImportDeclaration({
        moduleSpecifier: './state',
        namedImports: [stateName]
      })
    } else if (extendsStr) {
      extendsStr += '>'
    }

    // add common react imports
    viewFile.addImportDeclarations([
      {
        moduleSpecifier: 'react',
        defaultImport: 'React'
      },
      {
        moduleSpecifier: 'react-native',
        namedImports: ['View', 'Text']
      }
    ])

    // main class
    const viewClass = viewFile.addClass({
      name,
      extends: `React.Component${extendsStr}`,
      isExported: true
    })

    // build props / state initializer
    if (hasProps || hasState) {
      viewClass.addConstructor({
        parameters: [
          {
            name: 'props',
            type: hasProps ? propsName : 'any'
          }
        ],
        statements: `super(props); ${
          hasState
            ? `this.state = ${ts.createObjectInitializerStatement(state)}`
            : ''
        }`
      })
    }

    // add render method
    viewClass.addMethod({
      name: 'render',
      statements: `return <View><Text>${name}</Text></View>`
    })

    await source.prettifyProjectFiles(project)
    await project.save()

    return {
      path: viewPath
    }
  }
}
