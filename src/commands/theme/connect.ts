import { RootContext } from '../../core/types'

export default {
  name: 'connect',
  alias: ['c'],
  hidden: true,
  description: 'Connect theme to view(s)',
  run: async (context: RootContext) => {
    const { ConnectThemeService } = await import(
      '../../services/theme/connect-theme'
    )
    const service = new ConnectThemeService(context)
    await service.run()
  }
}
