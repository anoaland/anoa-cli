export default {
  name: 'store',
  alias: ['s'],
  description: 'Store (redux) generator',
  run: async context => {
    const { StoreService } = await import('../services/store')
    const service = new StoreService(context)
    await service.build()
  }
}
