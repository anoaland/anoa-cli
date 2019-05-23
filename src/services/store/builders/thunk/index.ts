import * as path from 'path'
import Project, { SourceFile } from 'ts-morph'
import { RootContext } from '../../../../libs'
import { Source } from '../../../core'
import { ReduxThunkQA } from './qa'

export class ReduxThunkBuilder {
  context: RootContext
  project: Project
  qa: ReduxThunkQA
  source: Source
  thunkSourceFile: SourceFile

  constructor(context: RootContext) {
    this.context = context
    this.project = new Project()
    this.qa = new ReduxThunkQA(context, this.project)
    this.source = new Source(context)
  }

  async build() {
    await this.qa.run()
    await this.generate()
    await this.save()
  }

  async generate() {
    const {
      filesystem: { exists }
    } = this.context
    const { filePath, name, actionType } = this.qa

    const dispatch = actionType
      ? `dispatch({ type: ${actionType.type} ${
          actionType.payload ? ', payload' : ''
        } })`
      : ''

    const sourceFile = exists(filePath)
      ? this.project.addExistingSourceFile(filePath)
      : this.project.createSourceFile(filePath)

    sourceFile.addFunction({
      name,
      parameters:
        actionType && actionType.payload
          ? [
              {
                name: 'payload',
                type: actionType.payload
              }
            ]
          : undefined,
      returnType: 'AppThunkAction',
      bodyText: `return async dispatch => {        
            ${dispatch}
          }`,
      isExported: true
    })

    if (
      !sourceFile.getImportDeclaration(
        c =>
          c.getNamedImports().findIndex(i => i.getText() === 'AppThunkAction') >
          -1
      )
    ) {
      sourceFile.addImportDeclaration({
        moduleSpecifier: '..',
        namedImports: ['AppThunkAction']
      })
    }

    this.thunkSourceFile = sourceFile
  }

  async save() {
    const {
      print: { spin, colors },
      filesystem: { cwd }
    } = this.context
    const spinner = spin('Generating...')

    const targetFile = path.relative(cwd(), this.thunkSourceFile.getFilePath())
    await this.source.prettifySoureFile(this.thunkSourceFile)
    await this.project.save()

    spinner.succeed(
      `New thunk were successfully generated on ${colors.bold(targetFile)}`
    )
  }
}
