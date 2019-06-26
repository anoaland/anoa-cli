import * as path from 'path'
import { Reducer } from '../../../core/libs/reducer'
import {
  ActionTypeClause,
  CreateReduxThunkServiceArgs,
  FieldObject,
  RootContext
} from '../../../core/types'

export class CreateReduxThunkServiceQA {
  private context: RootContext

  constructor(context: RootContext) {
    this.context = context
  }

  async run(): Promise<CreateReduxThunkServiceArgs> {
    const {
      print: { colors },
      prompt,
      folder,
      filesystem: { exists, list, cwd },
      tools
    } = this.context

    const redux = tools.redux()

    redux.ensureStoreReady()

    // resolve name
    const { name } = await prompt.ask({
      type: 'input',
      name: 'name',
      message: 'Name of thunk',
      validate(val) {
        if (!val) {
          return 'Thunk name is required'
        }
        return true
      }
    })

    const cli = tools.cli()

    // resolve file path
    const baseDir = folder.thunks()
    let isNewFile = true

    if (exists(baseDir)) {
      isNewFile = await cli.confirm(
        'Do you want to create a new file for this thunk?'
      )
    }

    let filePath: string
    if (!isNewFile) {
      const thunkFiles = list(baseDir)
      const { selectedThunkFile } = await prompt.ask({
        type: 'select',
        name: 'selectedThunkFile',
        message: 'Select a file:',
        choices: thunkFiles
      })
      filePath = selectedThunkFile
    } else {
      const { newThunkFile } = await prompt.ask({
        type: 'input',
        name: 'newThunkFile',
        message: 'File name',
        initial: name,
        validate(val) {
          if (!val) {
            return 'File name is required'
          }
          return true
        }
      })
      filePath = newThunkFile
    }
    if (!filePath.endsWith('.ts')) {
      filePath += '.ts'
    }
    filePath = path.join(cwd(), folder.thunks(filePath))

    // resolve reducer
    const isFromReducer = await cli.confirm(
      'Do you want to generate thunk from reducer?'
    )

    let reducer: Reducer
    let actionType: ActionTypeClause
    if (isFromReducer) {
      reducer = await redux.selectReducer()
      actionType = await redux.selectActionType(reducer)
    }

    // resolve should returns promise?
    const isAsync = await cli.confirm('Should returns Promise?')

    // if this thunk is not generated from action type, then
    // resolve return type & parameters
    let returnType: string
    let parameters: FieldObject[]

    if (!isFromReducer) {
      ;({ returnType } = await prompt.ask({
        type: 'input',
        name: 'returnType',
        message: 'Specify the return type (optional)',
        format: val => {
          if (!val || !isAsync) {
            return val
          }

          return colors.bold(`Promise<${colors.cyan(val)}>`)
        }
      }))

      // resolve parameters
      parameters = await cli.askFieldObjects(
        'Specify function parameter(s)',
        true,
        true,
        true
      )
    }

    return {
      name,
      filePath,
      isAsync,
      actionType,
      returnType,
      parameters
    }
  }
}
