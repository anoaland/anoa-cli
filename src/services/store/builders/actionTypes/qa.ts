import * as path from 'path'
import Project, { SourceFile, SyntaxKind, TypeAliasDeclaration } from 'ts-morph'
import { RootContext } from '../../../../libs'
import { FieldObject, ObjectBuilder, Utils } from '../../../core'
import { ProjectBrowser } from '../../../core/project-browser'

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
      filesystem: { exists },
      print: { colors, fancy }
    } = this.context
    const reducer = await this.projectBrowser.browseReducers()
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

    this.reducerSourceFile = this.project.addExistingSourceFile(reducer.path)
    this.reducerName = reducer.name

    this.actionTypesSourceFile = this.project.addExistingSourceFile(
      actionTypesPath
    )

    this.actionTypesAlias = this.actionTypesSourceFile.getTypeAlias(
      actionImport.getNamedImports()[0].getText()
    )

    this.actionTypesAliasType = this.actionTypesAlias.getTypeNode().getText()
    if (this.actionTypesAliasType !== 'any') {
      const actionTypes = this.actionTypesAlias
        .getDescendantsOfKind(SyntaxKind.TypeLiteral)
        .map(p => {
          return (
            '  ' +
            p
              .getMembers()
              .map(m => {
                const pm = m.getText().split(':')
                return colors.blue(pm[0]) + ':' + colors.yellow(pm[1])
              })
              .join(', ')
          )
        })
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
