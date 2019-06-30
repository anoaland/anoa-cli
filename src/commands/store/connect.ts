import { RootContext } from '../../core/types'

export default {
  name: 'connect',
  alias: ['c'],
  hidden: true,
  description: 'Connect to view(s)',
  run: async (context: RootContext) => {
    const { ReduxConnectService } = await import('../../services/store/connect')
    const service = new ReduxConnectService(context)
    await service.run()
  }
}
