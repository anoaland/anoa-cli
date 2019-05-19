import { RootContext } from '../libs'
import { StoreService } from '../services/store'

export default {
  name: 'store',
  alias: ['s'],
  description: 'Store (redux) generator',
  run: async (context: RootContext) => {
    const service = new StoreService(context)
    await service.build()
  }
}
