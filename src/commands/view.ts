import { RootContext } from '../libs'

export default {
  name: 'view',
  alias: ['v'],
  description: 'View generator',
  run: async (context: RootContext) => {
    const {
      parameters: { first, second },
      prompt,
      createClassView,
      createStatelessView,
      storeStateList,
      storeAppActionList,
      strings: { pascalCase, camelCase },
      print,
      relative,
    } = context

    await storeAppActionList()

    const taskCreateComponent = 'Create new component'
    const taskCreateScreen = 'Create new screen'

    let task = undefined

    switch (first) {
      case 'c':
        task = taskCreateComponent
        break
      case 's':
        task = taskCreateScreen
        break
    }

    if (!task) {
      const { pickTask } = await prompt.ask([
        {
          name: 'pickTask',
          message: 'What would you like to do with view?',
          type: 'list',
          choices: [taskCreateComponent, taskCreateScreen],
        },
      ])
      task = pickTask
    }

    const strToCreate = task === taskCreateComponent ? 'component' : 'screen'

    const viewClass = `Class based ${strToCreate}`
    const viewStateless = `Stateless ${strToCreate}`
    const viewStatelessFunctional = `Stateless functional ${strToCreate}`

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

        const storeStates = await storeStateList()
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

        const storeAppActions = await storeAppActionList()
        const importStatements = []
        const storePath =
          strToCreate === 'screen'
            ? relative('store', 'views/screens/foo')
            : relative('store', 'views/components/foo')

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

        await createClassView(strToCreate, name, props)

        break

      case viewStateless:
        await createStatelessView(strToCreate, name, false)
        break

      case viewStatelessFunctional:
        await createStatelessView(strToCreate, name, true)
        break
    }
  },
}
