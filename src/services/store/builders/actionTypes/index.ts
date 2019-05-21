import * as path from 'path'
import Project, { SyntaxKind } from 'ts-morph'
import { RootContext } from '../../../../libs'
import { Source } from '../../../core'
import { ReducerActionTypesQA } from './qa'

export class ReducerActionTypesBuilder {
  context: RootContext
  qa: ReducerActionTypesQA
  project: Project
  source: Source

  constructor(context: RootContext) {
    this.context = context
    this.project = new Project()
    this.qa = new ReducerActionTypesQA(context, this.project)
    this.source = new Source(context)
  }

  async build() {
    await this.qa.run()
    await this.generateNewActionTypes()
    await this.generateSwitchStatement()
    await this.saveChanges()
  }

  async generateNewActionTypes() {
    const { actionTypesAlias, newActionTypes, actionTypesAliasType } = this.qa
    if (!newActionTypes || !newActionTypes.length) {
      return
    }

    let actionTypes = actionTypesAliasType
    if (actionTypes === 'any') {
      actionTypes = ''
    } else {
      actionTypes += ' | '
    }

    actionTypes += newActionTypes
      .map(
        a => `{
      type: '${a.name}'
      ${a.type ? ', payload: ' + a.type : ''}
    }`
      )
      .join(' | ')

    actionTypesAlias.setType(actionTypes)
  }

  async generateSwitchStatement() {
    const { reducerSourceFile, newActionTypes } = this.qa
    if (!newActionTypes || !newActionTypes.length) {
      return
    }

    const caseBlock = reducerSourceFile.getFirstDescendantByKind(
      SyntaxKind.CaseBlock
    )
    const clauses = caseBlock.getClauses()

    const updatedClauses = clauses
      .filter(c => c.getKindName() !== 'DefaultClause')
      .map(c => c.getText() + '\r\n')

    updatedClauses.push(
      ...newActionTypes.map(
        a => `case '${a.name}':
          return { ...state }
        `
      )
    )

    updatedClauses.push(
      clauses.find(c => c.getKindName() === 'DefaultClause').getText()
    )

    caseBlock.replaceWithText(`{ ${updatedClauses.join('')} }`)
  }

  async saveChanges() {
    const {
      print: { colors, fancy, checkmark, spin },
      filesystem: { cwd }
    } = this.context

    const { actionTypesSourceFile, reducerSourceFile, newActionTypes } = this.qa

    if (!newActionTypes.length) {
      fancy(`${checkmark}  No changes have been made.`)
      return
    }

    const spinner = spin('Generating...')
    await this.source.prettifySoureFile(actionTypesSourceFile)
    await this.source.prettifySoureFile(reducerSourceFile)
    await this.project.save()

    const actionTypesFilePath = path.relative(
      cwd(),
      path.join(actionTypesSourceFile.getFilePath())
    )

    spinner.succeed(
      `New action types have been successfully added to ${colors.bold(
        actionTypesFilePath
      )}`
    )
  }
}
