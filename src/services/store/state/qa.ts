import { AddReducerStateArgs, RootContext } from '../../../core/types'

export class AddReducerStateServiceQA {
  context: RootContext

  constructor(context: RootContext) {
    this.context = context
  }

  async run(): Promise<AddReducerStateArgs> {
    const {
      print: { colors, fancy },
      tools
    } = this.context

    const redux = tools.redux()

    const reducer = await redux.selectReducer()

    const existingFields = reducer
      .getState()
      .getFields()
      .map(p => `  ${colors.yellow('+')} ${p.name}`)
      .join('\r\n')

    if (existingFields && existingFields.length) {
      fancy(colors.bold('  Existing fields:'))
      fancy(existingFields)
    }

    const cli = tools.cli()
    const utils = tools.utils()
    const fields = await cli.askFieldObjects('Add new fields', true, true)
    if (!fields.length) {
      utils.exit('Aborted - no fields entered')
    }

    const actionTypes = await redux.askGenerateActionTypesFromState(
      reducer.name,
      fields
    )

    return {
      reducer,
      state: fields,
      actionTypes
    }
  }
}
