export default {
  name: 'theme',
  alias: ['t'],
  description: 'Theme generator',
  run: async context => {
    const { ThemeService } = await import('../services/theme')
    const service = new ThemeService(context)
    await service.build()
  }
}
