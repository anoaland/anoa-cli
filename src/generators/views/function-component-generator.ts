import * as path from 'path'
import { Project } from 'ts-morph'
import { RootContext } from '../../core/types'
import {
  CreateComponentArgs,
  CreateComponentResult,
  ViewKindEnum
} from '../../core/types'

export class FunctionComponentGenerator {
  context: RootContext

  constructor(context: RootContext) {
    this.context = context
  }

  async generate(args: CreateComponentArgs): Promise<CreateComponentResult> {
    const { naming, tools } = this.context

    const react = tools.react()
    const source = tools.source()

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
      viewFile.addImportDeclaration({
        moduleSpecifier: './props',
        namedImports: [propsName]
      })
    }

    // build hooks as required
    const hasState = state && state.length
    let hooks = ''
    if (hasState) {
      viewFile.addImportDeclaration({
        moduleSpecifier: 'react',
        namedImports: ['useState']
      })
      hooks = react.createHooksStatements(state)
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

    // add main function
    viewFile.addFunction({
      name,
      parameters: hasProps
        ? [
            {
              name: 'props',
              type: propsName
            }
          ]
        : undefined,
      isExported: true,
      statements: `
      ${hooks}
      return <View><Text>${name}</Text></View>
      `
    })

    await source.prettifyProjectFiles(project)
    await project.save()

    return {
      path: viewPath
    }
  }
}
