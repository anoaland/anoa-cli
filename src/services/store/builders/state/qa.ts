import * as path from 'path'
import Project, { InterfaceDeclaration, SourceFile } from 'ts-morph'
import { RootContext } from '../../../../libs'
import { FieldObject, ObjectBuilder, Utils } from '../../../core'
import { ProjectBrowser } from '../../../core/project-browser'

export class ReducerStateQA {
  context: RootContext
  projectBrowser: ProjectBrowser
  utils: Utils
  objectBuilder: ObjectBuilder
  project: Project
  stateInterface: InterfaceDeclaration
  newFields: FieldObject[]
  reducerSourceFile: SourceFile
  stateSourceFile: SourceFile

  constructor(context: RootContext, project: Project) {
    this.context = context
    this.projectBrowser = new ProjectBrowser(context)
    this.utils = new Utils(context)
    this.objectBuilder = new ObjectBuilder(context)
    this.project = project
  }

  async run() {
    const {
      filesystem: { exists },
      print: { colors, fancy }
    } = this.context
    const reducer = await this.projectBrowser.browseReducers()
    const statePath = path.join(path.dirname(reducer.path), 'state.ts')
    if (!exists(statePath)) {
      this.utils.exit(`Can't find state.ts file.`)
      return
    }

    const stateImport = reducer.sourceFile.getImportDeclaration(
      i =>
        !!i
          .getModuleSpecifier()
          .getText()
          .match(/.\/state/g)
    )

    this.reducerSourceFile = this.project.addExistingSourceFile(reducer.path)
    this.stateSourceFile = this.project.addExistingSourceFile(statePath)

    this.stateInterface = this.stateSourceFile.getInterface(
      stateImport.getNamedImports()[0].getText()
    )

    const fields = this.stateInterface
      .getProperties()
      .map(p => `  ${colors.yellow('+')} ${p.getText()}`)
      .join('\r\n')

    if (fields && fields.length) {
      fancy(colors.bold('  Existing fields:'))
      fancy(fields)
    }
    await this.queryNewStateFields()
  }

  private async queryNewStateFields() {
    const {
      print: { colors, fancy }
    } = this.context
    fancy(colors.bold('  Add new fields:'))
    this.newFields = await this.objectBuilder.queryUserInput(true)
  }
}
