import { RootContext } from '../../core/types'

export default {
  name: 'props',
  alias: ['p'],
  hidden: true,
  description: 'Add / modify props',
  run: async (context: RootContext) => {
    const { PropsService } = await import('../../services/views/props')
    const service = new PropsService(context)
    await service.run()
  }
}
