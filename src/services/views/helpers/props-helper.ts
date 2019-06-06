import * as path from 'path'
import { InterfaceDeclaration, Project, SourceFile } from 'ts-morph'
import { RootContext } from '../../../libs'
import { FieldObject, ObjectBuilder, Source, Utils } from '../../core'
import { ReactUtils } from '../../core/react-utils'

export class PropsHelper {
  context: RootContext
  name: string
  location: string
  project: Project
  utils: Utils
  fields: FieldObject[]
  source: Source
  objectBuilder: ObjectBuilder
  file: SourceFile
  propsInterface: InterfaceDeclaration

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

  /**
   * Init props name and asking user to input props fields
   */
  async init(title: string = 'Props'): Promise<PropsFile> {
    const { print, naming } = this.context
    print.fancy(print.colors.yellow(`• ${title}:`))
    this.fields = await this.objectBuilder.queryUserInput()
    this.name = naming.props(this.name)
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
      path.join(this.location, 'props.ts')
    )
    this.propsInterface = this.file.addInterface({
      name: this.name,
      isExported: true
    })

    ReactUtils.replaceStateProperties(this.propsInterface, this.fields)
    return this.propsInterface
  }
}

export interface PropsFile {
  name: string
  fields: FieldObject[]
}
