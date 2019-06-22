import * as path from 'path'
import { Project } from 'ts-morph'
import { RootContext } from '../../../../tools/context'
import { Source } from '../../../core'
import { ReduxUtils } from '../../../core/redux-utils'
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
    await this.generateActionTypeClauses()
    await this.saveChanges()
  }

  async generateNewActionTypes() {
    const { actionTypesAlias, newActionTypes } = this.qa
    ReduxUtils.generateNewActionTypes(actionTypesAlias, newActionTypes)
  }

  async generateActionTypeClauses() {
    const { reducerSourceFile, newActionTypes } = this.qa
    await ReduxUtils.addActionTypeClauses(reducerSourceFile, newActionTypes)
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
