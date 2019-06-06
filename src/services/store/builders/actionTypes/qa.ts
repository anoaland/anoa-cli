import { Project, SourceFile, TypeAliasDeclaration } from 'ts-morph'
import { RootContext } from '../../../../libs'
import { FieldObject, ObjectBuilder, Utils } from '../../../core'
import { ProjectBrowser } from '../../../core/project-browser'
import { ReduxUtils } from '../../../core/redux-utils'

export class ReducerActionTypesQA {
  context: RootContext
  projectBrowser: ProjectBrowser
  utils: Utils
  objectBuilder: ObjectBuilder
  project: Project
  actionTypesAlias: TypeAliasDeclaration
  actionTypesAliasType: string
  newActionTypes: FieldObject[]
  reducerSourceFile: SourceFile
  actionTypesSourceFile: SourceFile
  reducerName: string

  constructor(context: RootContext, project: Project) {
    this.context = context
    this.projectBrowser = new ProjectBrowser(context)
    this.utils = new Utils(context)
    this.objectBuilder = new ObjectBuilder(context)
    this.project = project
  }

  async run() {
    const {
      print: { colors, fancy }
    } = this.context
    const reducer = await this.projectBrowser.browseReducers()
    this.reducerSourceFile = this.project.addExistingSourceFile(reducer.path)
    this.reducerName = reducer.name

    const {
      sourceFile,
      typeAlias,
      actionTypeChoices
    } = ReduxUtils.resolveActionTypes(this.context, this.project, reducer)

    this.actionTypesSourceFile = sourceFile
    this.actionTypesAlias = typeAlias
    this.actionTypesAliasType = this.actionTypesAlias.getTypeNode().getText()
    if (this.actionTypesAliasType !== 'any') {
      const actionTypes = Object.keys(actionTypeChoices())
        .map(s => '  ' + s)
        .join('\r\n')
      fancy(colors.bold('  Existing action types:'))
      fancy(actionTypes)
    }

    await this.queryNewActionTypes()
  }

  private async queryNewActionTypes() {
    const {
      print: { colors, fancy }
    } = this.context
    fancy(colors.bold('  Add new action types:'))
    this.newActionTypes = await this.objectBuilder.queryReduxActionTypesInput(
      this.reducerName
    )
  }
}
