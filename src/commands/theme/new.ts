import { RootContext } from '../../core/types'

export default {
  name: 'new',
  alias: ['n'],
  hidden: true,
  description: 'Create new theme',
  run: async (context: RootContext) => {
    const { CreateThemeService } = await import(
      '../../services/theme/create-theme'
    )
    const service = new CreateThemeService(context)
    await service.run()
  }
}
