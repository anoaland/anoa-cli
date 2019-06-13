export default {
  name: 'view',
  alias: ['v'],
  description: 'View generator',
  run: async context => {
    const { ViewService } = await import('../services/views')
    const service = new ViewService(context)
    await service.build()
  }
}
