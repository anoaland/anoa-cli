import { RootContext } from '../../core/types'

export default {
  name: 'thunk',
  alias: ['t'],
  hidden: true,
  description: 'Add new thunk',
  run: async (context: RootContext) => {
    const { CreateReduxThunkService } = await import(
      '../../services/store/thunk'
    )
    const service = new CreateReduxThunkService(context)
    await service.run()
  }
}
