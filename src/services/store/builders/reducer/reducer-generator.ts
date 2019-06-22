import * as path from 'path'
import { Project, VariableDeclarationKind } from 'ts-morph'
import { RootContext } from '../../../../tools/context'
import { Source } from '../../../core'
import { ReducerProps } from './qa'

export class ReducerGenerator {
  context: RootContext
  props: ReducerProps
  project: Project
  source: Source

  constructor(context: RootContext, project: Project, props: ReducerProps) {
    this.context = context
    this.props = props
    this.project = project
    this.source = new Source(context)
  }

  async generate() {
    const {
      location,
      name,
      stateFields,
      stateActionTypes,
      customActionTypes
    } = this.props
    const { naming } = this.context

    const targetFile = path.join(location, 'index.ts')
    const storeName = naming.store(name)
    const reducerName = storeName.reducer()
    const reducerStateName = storeName.state()
    const reducerActionTypeName = storeName.action()

    const reducerFile = this.project.createSourceFile(targetFile)
    reducerFile.addImportDeclarations([
      {
        moduleSpecifier: 'redux',
        namedImports: ['Reducer']
      },
      {
        moduleSpecifier: './actions',
        namedImports: [reducerActionTypeName]
      },
      {
        moduleSpecifier: './state',
        namedImports: [reducerStateName]
      }
    ])

    const stateInitializer = stateFields
      .filter(s => !s.optional)
      .map(s => `${s.name}: ${s.initial}`)
      .join(',')

    let body = stateActionTypes
      .map(
        a => `case '${a.name}':
        return { ...state, ${a.data.name}: action.payload }`
      )
      .join('\r\n')

    if (customActionTypes.length) {
      body +=
        '\r\n' +
        customActionTypes
          .map(
            a => `case '${a.name}':
      return { ...state }`
          )
          .join('\r\n')
    }

    reducerFile.addVariableStatement({
      declarations: [
        {
          name: reducerName,
          type: `Reducer<${reducerStateName}, ${reducerActionTypeName}>`,
          initializer: `(state = {
            ${stateInitializer}
          },
          action
          ) => {
            switch (action.type) {
              ${body || ''}          
              default:
                return state
            }
          }`
        }
      ],
      isExported: true,
      declarationKind: VariableDeclarationKind.Const
    })

    await this.source.prettifySoureFile(reducerFile)
  }
}
