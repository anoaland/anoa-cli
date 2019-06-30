import { RootContext } from '../../core/types'

export default {
  name: 'state',
  alias: ['s'],
  hidden: true,
  description: 'Add new state',
  run: async (context: RootContext) => {
    const { AddReducerStateService } = await import(
      '../../services/store/state'
    )
    const service = new AddReducerStateService(context)
    await service.run()
  }
}
