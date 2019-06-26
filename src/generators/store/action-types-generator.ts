import { AddActionTypesArgs, RootContext } from '../../core/types'

export class ActionTypesGenerator {
  private context: RootContext

  constructor(context: RootContext) {
    this.context = context
  }

  async generate(args: AddActionTypesArgs) {
    const {
      tools: { source },
      print: { spin, colors }
    } = this.context

    const spinner = spin('Generating...')

    const { reducer, actionTypes } = args
    reducer.addActionTypes(actionTypes)

    await source().save()

    spinner.succeed(
      `New state fields have been successfully added to ${colors.bold(
        reducer.getActionTypes().relativePath()
      )}`
    )
  }
}
