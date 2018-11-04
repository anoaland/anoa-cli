module.exports = {
  name: 'store',
  alias: ['s'],
  description: 'Redux store generator',
  run: async context => {
    const {
      storeCreateReducer,
      storeUpdateReducers,
      prompt,
      print,
      strings: { isBlank },
    } = context

    const taskCreateReducer = 'Create new reducer'
    const taskCreateAction = 'Create new action'
    const taskUpdate = 'Update application root state'

    const { task } = await prompt.ask([
      {
        name: 'task',
        message: 'What would you like to do with store?',
        type: 'list',
        choices: [taskCreateReducer, taskCreateAction, taskUpdate],
      },
    ])

    if (task !== taskUpdate) {
      const { name } = await prompt.ask([
        {
          type: 'input',
          name: 'name',
          message: `Name of ${task === taskCreateReducer ? 'reducer' : 'action'}?`,
        },
      ])

      if (!name || isBlank(name)) {
        print.error('Name is required')
        process.exit(0)
      }

      const { states } = await prompt.ask([
        {
          type: 'input',
          name: 'states',
          message: `Specify state you'd like to have (separated with space), or leave it blank thus we will generate example for you`,
        },
      ])

      await storeCreateReducer(name, (states || 'foo,bar').split(' ').map(s => s.trim()))
      print.success(
        'New reducer was successfully created on ' +
          print.colors.yellow(`src/store/reducers/${name.toLowerCase()}`) +
          '.',
      )
    } else {
      await storeUpdateReducers()
    }
  },
}
