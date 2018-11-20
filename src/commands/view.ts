import { RootContext } from '../libs'
import { ViewType } from '../libs/types'

export default {
  name: 'view',
  alias: ['v'],
  description: 'View generator',
  run: async (context: RootContext) => {
    const {
      parameters: { first, second },
      prompt,
      view,
      strings: { pascalCase, kebabCase },
      print,
      utils,
      style,
      reduxStore,
    } = context

    const taskCreateComponent = 'Create new component'
    const taskCreateScreen = 'Create new screen'
    const taskCreateTheme = 'Create new theme'
    const taskConnectTheme = 'Connect theme to view (screen / component)'

    const themes = await style.themes()

    // Task query

    let task = undefined

    switch (first) {
      case 'c':
        task = taskCreateComponent
        break
      case 's':
        task = taskCreateScreen
        break
      case 't':
        task = taskCreateTheme
        break
      case 'h':
        task = taskConnectTheme
        break
    }

    if (!task) {
      const choices = [taskCreateComponent, taskCreateScreen, taskCreateTheme]

      if (themes) {
        choices.push(taskConnectTheme)
      }

      const { pickTask } = await prompt.ask([
        {
          name: 'pickTask',
          message: 'What would you like to do with view?',
          type: 'list',
          choices,
        },
      ])
      task = pickTask
    }

    if (task === taskCreateTheme) {
      await style.createTheme()
      return
    }

    if (task === taskConnectTheme) {
      await style.connectTheme()
      return
    }

    const strToCreate = task === taskCreateComponent ? 'component' : 'screen'

    // Screen or component name query

    let name = second
    if (!name) {
      name = (await prompt.ask([
        {
          type: 'input',
          name: 'name',
          message: `${pascalCase(strToCreate)} name`,
        },
      ])).name
    }

    if (!name) {
      print.error('Name is required')
      process.exit(0)
      return
    }

    // Screen or component type

    const viewClass = `Class based ${strToCreate}`
    const viewStateless = `Stateless ${strToCreate}`
    const viewStatelessFunctional = `Stateless functional ${strToCreate}`
    const { type } = await prompt.ask([
      {
        name: 'type',
        message: `Select ${strToCreate} type`,
        type: 'list',
        choices: [viewClass, viewStateless, viewStatelessFunctional],
      },
    ])
    if (!type) {
      print.error(`${pascalCase(strToCreate)} type is required`)
      process.exit(0)
      return
    }

    // Select location

    let location = '/'
    const locations = await utils.dirNames(`src/views/${strToCreate}s`)
    if (locations.length) {
      location = (await prompt.ask([
        {
          name: 'location',
          message: 'Location',
          type: 'list',
          choices: locations,
        },
      ])).location
    }

    if (location.length > 1) {
      location += '/'
    }

    const viewName = pascalCase(name) + (strToCreate === 'screen' ? 'Screen' : '')
    const importLocalProps = [`${viewName}Props`]
    const importLocalState = []

    switch (type) {
      case viewClass:
        const withState = await prompt.confirm(`Do you want to have state in your ${strToCreate}?`)

        if (withState) {
          importLocalState.push(`${viewName}State`)
        }

        const importStatements = []

        if (importLocalProps.length) {
          importStatements.push(`import { ${importLocalProps.sort().join(',')} } from './props'`)
        }

        if (importLocalState.length) {
          importStatements.push(`import { ${importLocalState.sort().join(',')} } from './state'`)
        }

        const props = {
          withState,
          importStatements,
        }

        await view.createClassView(strToCreate, name, props, location)
        break

      case viewStateless:
        await view.createStatelessView(strToCreate, name, false, location)
        break

      case viewStatelessFunctional:
        await view.createStatelessView(strToCreate, name, true, location)
        break
    }

    const dir = `src/views/${strToCreate.toLowerCase()}s`
    const viewPath = location + kebabCase(name)
    let connectedToTheme = false

    if (themes) {
      const connectToTheme = await prompt.confirm('Do you want to connect to theme?')

      if (connectToTheme) {
        switch (type) {
          case viewClass:
            await style.connectThemeToViewClass(dir, { name: viewName, path: viewPath })
            break
          case viewStateless:
            await style.connectThemeToStatelessView(dir, { name: viewName, path: viewPath })
            break
          case viewStatelessFunctional:
            await style.connectThemeToStatelessFunctionalView(dir, {
              name: viewName,
              path: viewPath,
            })
            break
        }
        connectedToTheme = true
      }
    }

    const sa = await reduxStore.getStateAndThunks()
    if (sa.states || sa.thunks) {
      const connectToStore = await prompt.confirm('Do you want to connect to redux store?')
      if (connectToStore) {
        let viewType: ViewType = 'class'
        if (connectedToTheme && type !== viewClass) {
          viewType = 'hoc'
        } else {
          switch (type) {
            case viewStateless:
              viewType = 'stateless'
              break
            case viewStatelessFunctional:
              viewType = 'functional'
          }
        }

        await reduxStore.connectStore(
          sa,
          {
            name: viewName,
            option: '',
            path: viewPath,
            type: viewType,
          },
          strToCreate,
        )
      }
    }

    print.success(
      `New ${strToCreate} named ${print.colors.magenta(
        viewName,
      )} was successfully created on ${print.colors.yellow(`${dir}${viewPath}/index.tsx`)}`,
    )
  },
}
