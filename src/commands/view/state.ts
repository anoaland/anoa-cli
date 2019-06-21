import { RootContext } from '../../libs'

export default {
  name: 'state',
  alias: ['t'],
  hidden: true,
  description: 'Add / modify state',
  run: async (context: RootContext) => {
    const { StateService } = await import('../../services/views/state')
    const service = new StateService(context)
    await service.run()
  }
}
