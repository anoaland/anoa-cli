import * as path from 'path'
import { InterfaceDeclaration, Project, SourceFile } from 'ts-morph'
import { RootContext } from '../../../libs'
import { FieldObject, ObjectBuilder, Source, Utils } from '../../core'
import { ReactUtils } from '../../core/react-utils'

export class StateHelper {
  context: RootContext
  name: string
  location: string
  project: Project
  utils: Utils
  fields: FieldObject[]
  source: Source
  objectBuilder: ObjectBuilder
  stateInterface: InterfaceDeclaration
  file: SourceFile

  constructor(
    context: RootContext,
    project: Project,
    baseName: string,
    location: string
  ) {
    this.context = context
    this.project = project
    this.name = baseName
    this.location = location
    this.fields = []
    this.utils = new Utils(context)
    this.source = new Source(context)
    this.objectBuilder = new ObjectBuilder(context)
  }

  /**
   * Init state name and asking user to input state fields
   */
  async init(title: string = 'State'): Promise<StateFile> {
    const { print, naming } = this.context
    print.fancy(print.colors.yellow(`• ${title}:`))
    this.fields = await this.objectBuilder.queryUserInput(true)
    this.name = naming.state(this.name)
    return {
      name: this.name,
      fields: this.fields
    }
  }

  /**
   * Build file processing
   */
  async createFile() {
    this.createInterface()
    await this.source.prettifySoureFile(this.file)
  }

  /**
   * Create new state interface
   */
  createInterface() {
    this.file = this.project.createSourceFile(
      path.join(this.location, 'state.ts')
    )
    this.stateInterface = this.file.addInterface({
      name: this.name,
      isExported: true
    })

    ReactUtils.replaceStateProperties(this.stateInterface, this.fields)
    return this.stateInterface
  }
}

export interface StateFile {
  name: string
  fields: FieldObject[]
}
