import { OptionalKind, ParameterDeclarationStructure, Project } from 'ts-morph'
import { CreateReduxThunkServiceArgs, RootContext } from '../../core/types'

export class ReduxThunkGenerator {
  private context: RootContext
  private args: CreateReduxThunkServiceArgs

  constructor(context: RootContext) {
    this.context = context
  }

  async generate(args: CreateReduxThunkServiceArgs) {
    const {
      tools: { source, utils, ts },
      print: { spin, colors },
      filesystem: { exists },
      folder,
      naming
    } = this.context

    this.args = args

    const { isAsync, filePath, actionType, name } = args

    const spinner = spin('Generating...')

    // build function body
    const body = actionType
      ? `dispatch({ type: ${actionType.type} ${
          actionType.payload ? ', payload' : ''
        } })`
      : `throw new Error('not implemented')`

    // create new project instance, since we won't save anything
    // under global project
    const project = new Project()

    // create or use existing file
    const sourceFile = exists(filePath)
      ? project.addExistingSourceFile(filePath)
      : project.createSourceFile(filePath)

    sourceFile.addFunction({
      name: naming.thunk(name),
      parameters: this.resolveParameters(),
      returnType: this.resolveReturnType(),
      statements: `return ${isAsync ? 'async ' : ''}dispatch => {
            ${body}
          }`,
      isExported: true
    })

    ts().addNamedImport(sourceFile, folder.store(), 'AppThunkAction')

    await source().prettifySoureFile(sourceFile)
    await project.save()

    spinner.succeed(
      `New thunk were successfully generated on ${colors.bold(
        utils().relativePath(sourceFile.getFilePath())
      )}`
    )
  }

  private resolveReturnType(): string {
    const { returnType, isAsync } = this.args
    if (isAsync) {
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
    const { actionType, parameters } = this.args
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
