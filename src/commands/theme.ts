import { RootContext } from '../libs'
import { ThemeService } from '../services/theme'

export default {
  name: 'theme',
  alias: ['t'],
  description: 'Theme generator',
  run: async (context: RootContext) => {
    const service = new ThemeService(context)
    await service.build()
  }
}
