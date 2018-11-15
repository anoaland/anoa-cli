import { RootContext } from '../libs'

export default {
  name: 'view',
  alias: ['v'],
  description: 'View generator',
  run: async (context: RootContext) => {
    const {
      parameters: { first, second },
      prompt,
      view,
      strings: { pascalCase, camelCase, kebabCase },
      print,
      utils,
      style,
      reduxStore,
    } = context

    const taskCreateComponent = 'Create new component'
    const taskCreateScreen = 'Create new screen'
    const taskCreateTheme = 'Create new theme'

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
    }

    if (!task) {
      const { pickTask } = await prompt.ask([
        {
          name: 'pickTask',
          message: 'What would you like to do with view?',
          type: 'list',
          choices: [taskCreateComponent, taskCreateScreen, taskCreateTheme],
        },
      ])
      task = pickTask
    }

    if (task === taskCreateTheme) {
      await style.createTheme()
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

    const baseName = pascalCase(name) + (strToCreate === 'screen' ? 'Screen' : '')
    const importLocalProps = [`${baseName}Props`]
    const importLocalState = []

    switch (type) {
      case viewClass:
        const withState = await prompt.confirm(`Do you want to have state in your ${strToCreate}?`)

        if (withState) {
          importLocalState.push(`${baseName}State`)
        }

        let stateProps = undefined
        let stateMap = undefined
        let actionProps = undefined
        let actionMap = undefined
        let actionImports = undefined

        const storeStates = await reduxStore.reducerStates()

        if (storeStates) {
          const withStoreState = await prompt.confirm(
            `Do you want to map application state into props?`,
          )
          if (withStoreState) {
            const choices = {}
            for (const k of Object.keys(storeStates)) {
              choices[pascalCase(k) + 'State'] = Object.keys(storeStates[k]).map(o => k + '.' + o)
            }

            const { statesToMap } = await prompt.ask([
              {
                name: 'statesToMap',
                type: 'checkbox',
                message: 'Select state(s) you want to map',
                radio: true,
                choices,
              },
            ])

            stateProps = []
            stateMap = []
            for (const st of statesToMap) {
              const s = st.split('.')
              const stateType = storeStates[s[0]][s[1]]
              const prop = camelCase(s[0] + '-' + s[1])

              stateProps.push(`${prop}: ${stateType}`)
              stateMap.push(`${prop}: state.${st}`)
            }

            importLocalProps.push(`${baseName}StateProps`)
          }
        }

        const storeAppActions = await reduxStore.thunkActions()
        const importStatements = []
        const storePath =
          strToCreate === 'screen'
            ? utils.relative('store', `views/screens${location}foo`)
            : utils.relative('store', `views/components${location}foo`)

        if (storeAppActions) {
          const withStoreAction = await prompt.confirm(
            'Do you want to map application action into props?',
          )

          if (withStoreAction) {
            const choices = []
            for (const k of Object.keys(storeAppActions)) {
              choices.push(`${k}(${JSON.stringify(storeAppActions[k].params).replace(/\"/g, '')})`)
            }

            const { actionsToMap } = await prompt.ask([
              {
                name: 'actionsToMap',
                type: 'checkbox',
                message: 'Select state(s) you want to map',
                radio: true,
                choices,
              },
            ])

            actionProps = []
            actionMap = []
            actionImports = {}

            for (const st of actionsToMap as string[]) {
              const a = st.split('(')[0].trim()
              const act = storeAppActions[a]
              const prop = a.substr(0, a.length - 6)
              actionProps.push(
                `${prop}: (${Object.keys(act.params)
                  .map(k => `${k}: ${act.params[k]}`)
                  .join(',')}) => void`,
              )
              actionMap.push(
                `${prop}: (${Object.keys(act.params).join(', ')}) => dispatch(${a}(${Object.keys(
                  act.params,
                ).join(', ')}))`,
              )

              actionImports[act.file] = [...(actionImports[act.file] || []), a]
            }

            for (const impor of Object.keys(actionImports)) {
              importStatements.push(
                `import { ${actionImports[impor].join(
                  ',',
                )} } from '${storePath}/actions/${impor.substr(0, impor.length - 3)}'`,
              )
            }

            importLocalProps.push(`${baseName}ActionProps`)
          }
        }

        const withStore = !!stateProps || !!actionProps

        if (withStore) {
          importStatements.splice(0, 0, `import { AppStore } from '${storePath}'`)
        }

        if (importLocalProps.length) {
          importStatements.push(`import { ${importLocalProps.sort().join(',')} } from './props'`)
        }

        if (importLocalState.length) {
          importStatements.push(`import { ${importLocalState.sort().join(',')} } from './state'`)
        }

        const props = {
          withState,
          stateProps,
          stateMap,
          actionProps,
          actionMap,
          importStatements,
          withStore,
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

    print.success(
      `New ${strToCreate} named ${print.colors.magenta(
        baseName,
      )} was successfully created on ${print.colors.yellow(
        `src/views/${strToCreate}s${location}${kebabCase(baseName)}/index.tsx`,
      )}`,
    )
  },
}
