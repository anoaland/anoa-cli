import * as path from 'path'
import {
  OptionalKind,
  ParameterDeclarationStructure,
  Project,
  SourceFile
} from 'ts-morph'
import { RootContext } from '../../../../tools/context'
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
    const { filePath, name, actionType, returnPromise } = this.qa

    const dispatch = actionType
      ? `dispatch({ type: ${actionType.type} ${
          actionType.payload ? ', payload' : ''
        } })`
      : `throw new Error('not implemented')`

    const sourceFile = exists(filePath)
      ? this.project.addExistingSourceFile(filePath)
      : this.project.createSourceFile(filePath)

    sourceFile.addFunction({
      name,
      parameters: this.resolveParameters(),
      returnType: this.resolveReturnType(),
      statements: `return ${returnPromise ? 'async ' : ''}dispatch => {
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

  private resolveReturnType(): string {
    const { returnType, returnPromise } = this.qa
    if (returnPromise) {
      return `AppThunkAction<Promise<${returnType || 'void'}>>`
    }

    if (returnType) {
      return `AppThunkAction<${returnType}>`
    }

    return 'AppThunkAction'
  }

  private resolveParameters(): Array<
    OptionalKind<ParameterDeclarationStructure>
  > {
    const { actionType, parameters } = this.qa
    if (actionType && actionType.payload) {
      return [
        {
          name: 'payload',
          type: actionType.payload
        }
      ]
    }

    if (parameters && parameters.length) {
      return parameters.map<OptionalKind<ParameterDeclarationStructure>>(p => ({
        name: p.name,
        type: p.type,
        hasQuestionToken: p.optional,
        initializer: p.initial
      }))
    }

    return []
  }
}
