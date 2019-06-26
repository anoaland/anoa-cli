import { AddReducerStateArgs, RootContext } from '../../core/types'

export class ReducerStateGenerator {
  private context: RootContext

  constructor(context: RootContext) {
    this.context = context
  }

  async generate(args: AddReducerStateArgs) {
    const {
      tools: { source },
      print: { spin, colors }
    } = this.context
    const { reducer, state, actionTypes } = args

    const spinner = spin('Generating...')

    reducer.addNewStateFields(state)
    reducer.addActionTypes(actionTypes)

    await source().save()

    spinner.succeed(
      `New state fields have been successfully added to ${colors.bold(
        reducer.relativePath()
      )}`
    )
  }
}
