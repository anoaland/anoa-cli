import * as path from 'path'
import { Project } from 'ts-morph'
import { RootContext } from '../../libs'
import { ReactUtils } from '../utils/react'
import { SourceUtils } from '../utils/source'
import { TsUtils } from '../utils/ts'
import {
  CreateComponentArgs,
  CreateComponentResult,
  ViewKindEnum
} from './types'

export class FunctionComponentGenerator {
  context: RootContext
  reactUtils: ReactUtils
  sourceUtils: SourceUtils
  tsUtils: TsUtils

  constructor(context: RootContext) {
    this.context = context
    this.reactUtils = new ReactUtils(context)
    this.sourceUtils = new SourceUtils(context)
    this.tsUtils = new TsUtils(context)
  }

  async generate(args: CreateComponentArgs): Promise<CreateComponentResult> {
    const { naming } = this.context

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
      const propsInterface = this.reactUtils.createPropsInterface(
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
      hooks = this.reactUtils.createHooksStatements(state)
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

    await this.sourceUtils.prettifyProjectFiles(project)
    await project.save()

    return {
      path: viewPath
    }
  }
}
