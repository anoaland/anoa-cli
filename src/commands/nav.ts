export default {
  name: 'nav',
  alias: ['n'],
  description: 'React navigator generator',
  run: async context => {
    const { NavigationService } = await import('../services/nav')
    const service = new NavigationService(context)
    await service.build()
  }
}
