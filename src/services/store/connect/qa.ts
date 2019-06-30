import { ReactView } from '../../../core/libs/react-view'
import { ReduxConnectArgs, RootContext } from '../../../core/types'

export class ReduxConnectServiceQA {
  private context: RootContext

  constructor(context: RootContext) {
    this.context = context
  }

  async run(): Promise<ReduxConnectArgs> {
    const { tools } = this.context

    const redux = tools.redux()

    const states = await redux.selectStates('Select state(s) you want to map')
    const thunks = await redux.selectThunks('Select thunk(s) you want to map')

    if (!states.length && !thunks.length) {
      tools.utils().exit('Cancelled - No state neither thunks were selected.')
      return
    }

    const cli = tools.cli()
    const views = (await cli.browseViews(
      undefined,
      true,
      'Select view(s) kind to connect'
    )) as ReactView[]

    return {
      states,
      thunks,
      views
    }
  }
}
