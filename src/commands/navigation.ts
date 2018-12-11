import { RootContext } from '../libs'

export default {
  name: 'navigation',
  alias: ['n', 'nav'],
  description: 'Navigator generator',
  run: async (context: RootContext) => {
    const {
      view,
      prompt,
      navigator,
      print,
      strings: { isBlank },
    } = context

    const { kind } = await prompt.ask([
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

    const screens = await view.viewInfoList('screen')
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

    const targetScreen = screens.find(s => s.option === screen)
    const isReplaceRenderFunction = await prompt.confirm(
      `Replace ${targetScreen.name} render function?`,
    )

    const { routes } = await prompt.ask([
      {
        name: 'routes',
        message: 'Routes to:',
        type: 'checkbox',
        radio: true,
        choices: screens.filter(s => s !== targetScreen).map(s => s.option),
      },
    ])

    if (!routes || !routes.length) {
      print.error('Routes is required.')
      process.exit(0)
      return
    }

    const initialRouteNames = routes.map(r => {
      return r.substr(0, r.indexOf('[') - 7)
    })
    const { initialRouteName } = await prompt.ask([
      {
        name: 'initialRouteName',
        message: 'Initial Route Name',
        type: 'list',
        choices: initialRouteNames,
      },
    ])

    await navigator.create(
      kind.replace(/\s/g, ''),
      targetScreen,
      isReplaceRenderFunction,
      screens.filter(s => routes.indexOf(s.option) > -1),
      isBlank(initialRouteName) ? initialRouteNames[0] : initialRouteName,
    )

    print.success(
      `New ${print.colors.magenta(kind)} was successfully created on ${print.colors.yellow(
        `'src/views/screens${targetScreen.path}/nav.tsx'`,
      )}.`,
    )
  },
}
