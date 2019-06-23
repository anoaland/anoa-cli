export default {
  name: 'nav',
  alias: ['n'],
  description: 'React navigator generator',
  run: async context => {
    const { CreateNavigatorService } = await import('../services/nav')
    const service = new CreateNavigatorService(context)
    await service.run()
  }
}
