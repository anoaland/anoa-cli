import * as path from 'path'
import Project, {
  PropertyAssignmentStructure,
  PropertySignatureStructure,
  SyntaxKind
} from 'ts-morph'
import { RootContext } from '../../../../libs'
import { ObjectBuilder, Source } from '../../../core'
import { ReduxUtils } from '../../../core/redux-utils'
import { ReducerStateQA } from './qa'

export class ReducerStateBuilder {
  context: RootContext
  qa: ReducerStateQA
  project: Project
  source: Source
  initializerModified: boolean
  objectBuilder: ObjectBuilder

  constructor(context: RootContext) {
    this.context = context
    this.project = new Project()
    this.qa = new ReducerStateQA(context, this.project)
    this.source = new Source(context)
    this.objectBuilder = new ObjectBuilder(context)
    this.initializerModified = false
  }

  async build() {
    await this.qa.run()
    await this.generateNewStateFields()
    await this.generateNewActionTypes()
    await this.generateActionTypeClauses()
    await this.saveChanges()
  }

  private async generateNewStateFields() {
    const { newFields, stateInterface, reducerSourceFile } = this.qa
    if (!newFields.length) {
      return
    }

    // add new fields to state
    stateInterface.addProperties(
      newFields.map<PropertySignatureStructure>(f => ({
        name: f.name,
        hasQuestionToken: f.optional,
        type: f.type
      }))
    )

    // set fields initializer
    const initializerFields = newFields.filter(f => !f.optional && f.initial)

    if (initializerFields.length) {
      this.initializerModified = true
      const stateInitializer = reducerSourceFile
        .getFirstDescendantByKind(SyntaxKind.ArrowFunction)
        .getFirstDescendantByKind(SyntaxKind.Parameter)
        .getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression)

      stateInitializer.addPropertyAssignments(
        initializerFields.map<PropertyAssignmentStructure>(f => ({
          name: f.name,
          initializer: f.initial
        }))
      )
    }
  }

  private async generateNewActionTypes() {
    const { actionTypesAlias, stateActionTypes } = this.qa
    ReduxUtils.generateNewActionTypes(actionTypesAlias, stateActionTypes)
  }

  private async generateActionTypeClauses() {
    const { stateActionTypes, reducerSourceFile } = this.qa
    await ReduxUtils.addActionTypeClauses(reducerSourceFile, stateActionTypes)
  }

  private async saveChanges() {
    const {
      print: { colors, fancy, checkmark, spin },
      filesystem: { cwd }
    } = this.context

    const {
      newFields,
      reducerSourceFile,
      stateSourceFile,
      actionTypesSourceFile
    } = this.qa

    if (!newFields.length) {
      fancy(`${checkmark}  No changes have been made.`)
      return
    }

    const spinner = spin('Generating...')

    await this.source.prettifySoureFile(reducerSourceFile)
    await this.source.prettifySoureFile(stateSourceFile)
    await this.source.prettifySoureFile(actionTypesSourceFile)
    await this.project.save()

    const stateFilePath = path.relative(
      cwd(),
      path.join(stateSourceFile.getFilePath())
    )

    spinner.succeed(
      `New state fields have been successfully added to ${colors.bold(
        stateFilePath
      )}${this.initializerModified ? ' and also initialized.' : ''}`
    )
  }
}
