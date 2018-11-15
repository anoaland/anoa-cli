import { RootContext } from '../libs'

export default {
  name: 'navigation',
  alias: ['n', 'nav'],
  description: 'Navigator generator',
  run: async (context: RootContext) => {
    const { view, prompt, navigator, print } = context

    const screens = await view.screenList()
    const { screen } = await prompt.ask([
      {
        name: 'screen',
        message: 'What screen should this navigator belongs to?',
        type: 'list',
        choices: screens.map(s => s.option),
      },
    ])

    if (!screen) {
      print.error('Screen where this navigator belongs to is required.')
      process.exit(0)
      return
    }

    const { routes, kind } = await prompt.ask([
      {
        name: 'routes',
        message: 'Routes to:',
        type: 'checkbox',
        choices: screens.map(s => s.option),
      },

      {
        name: 'kind',
        message: 'Type of navigator:',
        type: 'list',
        choices: [
          'Stack Navigator',
          'Switch Navigator',
          'Drawer Navigator',
          'Bottom Tab Navigator',
          'Material Top Tab Navigator',
        ],
      },
    ])

    if (!kind) {
      print.error('Type of navigator is required.')
      process.exit(0)
      return
    }

    const targetScreen = screens.find(s => s.option === screen)

    await navigator.create(
      kind.replace(/\s/g, ''),
      targetScreen,
      screens.filter(s => routes.indexOf(s.option) > -1),
    )

    print.success(
      `New ${print.colors.magenta(kind)} was successfully created on ${print.colors.yellow(
        `'src/views/screens${targetScreen.path}/nav.tsx'`,
      )}.`,
    )
  },
}
