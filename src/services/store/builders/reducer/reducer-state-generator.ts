import * as path from 'path'
import { Project, PropertySignatureStructure, StructureKind } from 'ts-morph'
import { RootContext } from '../../../../tools/context'
import { Source } from '../../../core'
import { ReducerProps } from './qa'

export class ReducerStateGenerator {
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
    const { location, name, stateFields } = this.props
    const { naming } = this.context

    const targetFile = path.join(location, 'state.ts')
    const reducerStateName = naming.store(name).state()

    const reducerStateFile = this.project.createSourceFile(targetFile)
    reducerStateFile.addInterface({
      name: reducerStateName,
      isExported: true,
      properties: stateFields.map<PropertySignatureStructure>(s => ({
        name: s.name,
        type: s.type,
        hasQuestionToken: s.optional,
        kind: StructureKind.PropertySignature
      }))
    })

    await this.source.prettifySoureFile(reducerStateFile)
  }
}
