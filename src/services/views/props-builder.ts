import * as path from 'path'
import Project, { PropertySignatureStructure } from 'ts-morph'
import { RootContext } from '../../libs'
import { FieldObject, ObjectBuilder, Source, Utils } from '../core'

export class PropsBuilder {
  context: RootContext
  name: string
  location: string
  project: Project
  utils: Utils
  fields: FieldObject[]
  source: Source
  objectBuilder: ObjectBuilder

  constructor(
    context: RootContext,
    project: Project,
    name: string,
    location: string
  ) {
    this.context = context
    this.project = project
    this.name = name
    this.location = location
    this.fields = []
    this.utils = new Utils(context)
    this.source = new Source(context)
    this.objectBuilder = new ObjectBuilder(context)
  }

  async init(): Promise<PropsFile> {
    const { print, naming } = this.context
    print.fancy(print.colors.yellow(`• Props:`))
    this.fields = await this.objectBuilder.queryUserInput()
    this.name = naming.props(this.name)
    return {
      name: this.name,
      fields: this.fields
    }
  }

  async buildFile() {
    const stateFile = this.project.createSourceFile(
      path.join(this.location, 'props.ts')
    )
    stateFile.addInterface({
      name: this.name,
      isExported: true,
      properties: this.fields.map<PropertySignatureStructure>(p => {
        return {
          name: p.name,
          type: p.type,
          optional: p.optional,
          hasQuestionToken: p.optional
        }
      })
    })

    await this.source.prettifySoureFile(stateFile)
  }
}

export interface PropsFile {
  name: string
  fields: FieldObject[]
}
