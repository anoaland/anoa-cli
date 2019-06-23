import * as path from 'path'
import {
  InterfaceDeclaration,
  Project,
  SourceFile,
  TypeAliasDeclaration
} from 'ts-morph'
import { RootContext } from '../../../../core/types'
import { FieldObject } from '../../../../core/types'
import { ObjectBuilder, Utils } from '../../../core'
import { ProjectBrowser } from '../../../core/project-browser'

export class ReducerStateQA {
  context: RootContext
  projectBrowser: ProjectBrowser
  utils: Utils
  objectBuilder: ObjectBuilder
  project: Project
  actionTypesAlias: TypeAliasDeclaration
  actionTypesAliasType: string
  stateInterface: InterfaceDeclaration
  newFields: FieldObject[]
  reducerName: string
  reducerSourceFile: SourceFile
  stateSourceFile: SourceFile
  stateActionTypes: FieldObject[]
  actionTypesSourceFile: SourceFile

  constructor(context: RootContext, project: Project) {
    this.context = context
    this.projectBrowser = new ProjectBrowser(context)
    this.utils = new Utils(context)
    this.objectBuilder = new ObjectBuilder(context)
    this.project = project
    this.stateActionTypes = []
  }

  async run() {
    const {
      filesystem: { exists },
      print: { colors, fancy }
    } = this.context
    const reducer = await this.projectBrowser.browseReducers()
    this.reducerName = reducer.name

    // add main reducer file to project
    this.reducerSourceFile = this.project.addExistingSourceFile(reducer.path)

    // resolve state
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

    this.stateSourceFile = this.project.addExistingSourceFile(statePath)
    this.stateInterface = this.stateSourceFile.getInterface(
      stateImport.getNamedImports()[0].getText()
    )

    // resolve action types
    const actionTypesPath = path.join(path.dirname(reducer.path), 'actions.ts')
    if (!exists(actionTypesPath)) {
      this.utils.exit(`Can't find actions.ts file.`)
      return
    }

    const actionImport = reducer.sourceFile.getImportDeclaration(
      i =>
        !!i
          .getModuleSpecifier()
          .getText()
          .match(/.\/actions/g)
    )
    this.actionTypesSourceFile = this.project.addExistingSourceFile(
      actionTypesPath
    )
    this.actionTypesAlias = this.actionTypesSourceFile.getTypeAlias(
      actionImport.getNamedImports()[0].getText()
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
    await this.queryActionTypes()
  }

  private async queryNewStateFields() {
    const {
      print: { colors, fancy }
    } = this.context
    fancy(colors.bold('  Add new fields:'))
    this.newFields = await this.objectBuilder.queryUserInput(true)
  }

  private async queryActionTypes() {
    const { newFields, reducerName } = this
    if (!newFields || !newFields.length) {
      return
    }

    this.stateActionTypes = await this.objectBuilder.queryReduxActionsBasedOnState(
      reducerName,
      newFields
    )
  }
}
