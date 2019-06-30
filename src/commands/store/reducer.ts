import { RootContext } from '../../core/types'

export default {
  name: 'reducer',
  alias: ['r'],
  hidden: true,
  description: 'Create new reducer',
  run: async (context: RootContext) => {
    const { CreateReducerService } = await import(
      '../../services/store/reducer'
    )
    const service = new CreateReducerService(context)
    await service.run()
  }
}
