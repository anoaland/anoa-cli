import * as path from 'path'
import Project from 'ts-morph'
import { RootContext } from '../../../../libs'
import { Source } from '../../../core'
import { ReducerProps } from './qa'

export class ReducerActionTypesGenerator {
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
    const { location, name, stateActionTypes, customActionTypes } = this.props
    const { naming } = this.context

    const targetFile = path.join(location, 'actions.ts')
    const reducerActionTypeName = naming.store(name).action()

    const reducerActionTypesFile = this.project.createSourceFile(targetFile)
    reducerActionTypesFile.addTypeAlias({
      name: reducerActionTypeName,
      type: [...stateActionTypes, ...customActionTypes]
        .map(
          a => `
        {
          type: '${a.name}',
          payload: ${a.type}
        }
      `
        )
        .join('|\r\n'),
      isExported: true
    })

    await this.source.prettifySoureFile(reducerActionTypesFile)
  }
}
