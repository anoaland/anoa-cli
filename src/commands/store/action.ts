import { RootContext } from '../../core/types'

export default {
  name: 'action',
  alias: ['a'],
  hidden: true,
  description: 'Add new action type',
  run: async (context: RootContext) => {
    const { AddActionTypesService } = await import(
      '../../services/store/action-types'
    )
    const service = new AddActionTypesService(context)
    await service.run()
  }
}
