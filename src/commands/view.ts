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
      strings: { pascalCase, camelCase },
    } = context

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

          const storeStates = await storeStateList()
          if (storeStates) {
            const choices = {}
            for (const k of Object.keys(storeStates)) {
              choices[pascalCase(k) + 'State'] = Object.keys(storeStates[k]).map(o => k + '.' + o)
            }

            const withStoreState = await prompt.confirm('Do you want to map the reducer state?')
            if (withStoreState) {
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

          await createClassComponent(name, {
            withState,
            stateProps,
            stateMap,
            withStore: !!stateProps,
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
