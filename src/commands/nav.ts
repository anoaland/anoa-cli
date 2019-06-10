import { RootContext } from '../libs'
import { NavigationService } from '../services/nav'

export default {
  name: 'nav',
  alias: ['n'],
  description: 'React navigator generator',
  run: async (context: RootContext) => {
    const service = new NavigationService(context)
    await service.build()
  }
}
