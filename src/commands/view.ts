import { GluegunRunContext } from 'gluegun'

module.exports = {
  name: 'view',
  alias: ['v'],
  description: 'View generator',
  run: async (context: GluegunRunContext) => {
    const {
      parameters: { first },
      prompt,
      createClassComponent,
      createStatelessComponent,
      storeStateList,
      storeAppActionList,
      strings: { pascalCase, camelCase },
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

    if (task === taskCreateComponent) {
      const componentClass = 'Class based component'
      const componentStateless = 'Stateless component'
      const componentStatelessFunctional = 'Stateless functional component'

      const { name, type } = await prompt.ask([
        {
          type: 'input',
          name: 'name',
          message: 'Component name',
        },
        {
          name: 'type',
          message: 'Select component type',
          type: 'list',
          choices: [componentClass, componentStateless, componentStatelessFunctional],
        },
      ])

      switch (type) {
        case componentClass:
          const withState = await prompt.confirm('Do you want to have state in your component?')
          let stateProps = undefined
          let stateMap = undefined
          let actionProps = undefined
          let actionMap = undefined
          let actionImports = undefined

          const storeStates = await storeStateList()
          if (storeStates) {
            const withStoreState = await prompt.confirm(
              'Do you want to map application state into props?',
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
            }
          }

          const storeAppActions = await storeAppActionList()
          const importStatements = []

          if (storeAppActions) {
            const withStoreAction = await prompt.confirm(
              'Do you want to map application action into props?',
            )

            if (withStoreAction) {
              const choices = []
              for (const k of Object.keys(storeAppActions)) {
                choices.push(
                  `${k}(${JSON.stringify(storeAppActions[k].params).replace(/\"/g, '')})`,
                )
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
                  )} } from '../../store/actions/${impor.substr(0, impor.length - 3)}'`,
                )
              }
            }
          }

          await createClassComponent(name, {
            withState,
            stateProps,
            stateMap,
            actionProps,
            actionMap,
            importStatements,
            withStore: !!stateProps || !!actionProps,
          })
          break

        case componentStateless:
          await createStatelessComponent(name)
          break

        case componentStatelessFunctional:
          await createStatelessComponent(name, true)
          break
      }
    }
  },
}
