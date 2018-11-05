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
          await createClassComponent(name, withState)
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
