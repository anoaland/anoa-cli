import { RootContext } from '../libs'
import { ViewService } from '../services/views'

export default {
  name: 'view',
  alias: ['v'],
  description: 'View generator',
  run: async (context: RootContext) => {
    const service = new ViewService(context)
    await service.build()
  }
}
