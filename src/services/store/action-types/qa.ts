import { AddActionTypesArgs, RootContext } from '../../../core/types'

export class AddActionTypesServiceQA {
  context: RootContext

  constructor(context: RootContext) {
    this.context = context
  }

  async run(): Promise<AddActionTypesArgs> {
    const {
      print: { colors, fancy },
      tools
    } = this.context

    const redux = tools.redux()

    const reducer = await redux.selectReducer()

    const existingFields = reducer
      .getActionTypes()
      .getClauses()
      .map(
        p =>
          `  ${colors.yellow('+')} ${p.type}${
            p.payload ? `: ${colors.cyan(p.payload)}` : ''
          }`
      )
      .join('\r\n')

    if (existingFields && existingFields.length) {
      fancy(colors.bold('  Existing action types:'))
      fancy(existingFields)
    }

    const utils = tools.utils()

    const actionTypes = await redux.askActionTypes(reducer.name)
    if (!actionTypes.length) {
      utils.exit('Aborted - no action types entered')
    }

    return {
      reducer,
      actionTypes
    }
  }
}
