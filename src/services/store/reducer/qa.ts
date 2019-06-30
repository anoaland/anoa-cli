import { CreateReducerArgs, RootContext } from '../../../core/types'

export class CreateReducerServiceQA {
  context: RootContext

  constructor(context: RootContext) {
    this.context = context
  }

  async run(): Promise<CreateReducerArgs> {
    const {
      filesystem: { exists },
      parameters: { first },
      strings: { isBlank, kebabCase },
      folder,
      prompt,
      print: { colors },
      tools
    } = this.context

    // resolve name
    let name = first
    if (!name) {
      ;({ name } = await prompt.ask({
        type: 'input',
        name: 'name',
        message: `Reducer name`,
        validate: (val: string) => {
          return isBlank(val) ? 'reducer name is required' : true
        }
      }))
    }

    // resolve location
    const location = folder.reducers(kebabCase(name))
    if (exists(location)) {
      tools
        .utils()
        .exit(
          `Can't create store since ${colors.bold(location)} is already exists.`
        )
      return
    }

    const cli = tools.cli()
    const redux = tools.redux()

    // resolve state
    const stateFields = await cli.askFieldObjects(
      'Define reducer state:',
      true,
      true
    )

    // resolve action types
    const stateActionTypes = await redux.askGenerateActionTypesFromState(
      name,
      stateFields
    )

    // more action types
    const message = stateFields.length
      ? 'Add more action types'
      : 'Define action types'

    const customActionTypes = await redux.askActionTypes(name, message)

    return {
      name,
      location,
      stateFields,
      stateActionTypes,
      customActionTypes
    }
  }
}
