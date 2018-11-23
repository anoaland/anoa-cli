import { RootContext } from '../libs'

export default {
  name: 'store',
  alias: ['s'],
  description: 'Redux store generator',
  run: async (context: RootContext) => {
    const {
      parameters: { first },
      reduxStore,
      prompt,
      print,
      strings: { isBlank },
    } = context

    await reduxStore.reducerActions()

    const taskCreateReducer = 'Create new reducer'
    const taskCreateAction = 'Create new action'
    const taskUpdate = 'Update application root state'
    const taskConnect = 'Connect store to view'
    const taskAddReducerStateProperties = 'Add new reducer state properties'

    let task = undefined
    const stateAndThunks = await reduxStore.getStateAndThunks()
    const hasStore = !!stateAndThunks.states || !!stateAndThunks.thunks

    switch (first) {
      case 'r':
        task = taskCreateReducer
        break
      case 'a':
        task = taskCreateAction
        break
      case 'u':
        task = taskUpdate
        break
      case 'c':
        task = taskConnect
        break
      case 's':
        task = taskAddReducerStateProperties
    }

    if (!task) {
      const choices = [
        taskCreateReducer,
        taskCreateAction,
        taskAddReducerStateProperties,
        taskUpdate,
      ]
      if (hasStore) {
        choices.push(taskConnect)
      }
      const { pickTask } = await prompt.ask([
        {
          name: 'pickTask',
          message: 'What would you like to do with store?',
          type: 'list',
          choices,
        },
      ])
      task = pickTask
    }

    if (task === taskConnect) {
      await reduxStore.connectStore(stateAndThunks)
      return
    }

    if (task === taskAddReducerStateProperties) {
      await reduxStore.addNewReducerStateProperties(stateAndThunks)
      return
    }

    if (task !== taskUpdate) {
      if (task === taskCreateReducer) {
        // create reducer
        const { name } = await prompt.ask([
          {
            type: 'input',
            name: 'name',
            message: 'Reducer name',
          },
        ])

        const { states } = await prompt.ask([
          {
            type: 'input',
            name: 'states',
            message: `Specify state you'd like to have (separated with space, eg: foo:string='some value' bar:number=26), or leave it blank thus we will generate example for you:`,
          },
        ])

        await reduxStore.createReducer(name, (states || 'foo bar').split(' ').map(s => s.trim()))
        print.success(
          'New reducer was successfully created on ' +
            print.colors.yellow(`src/store/reducers/${name.toLowerCase()}/index.ts`),
        )
      } else {
        // create action
        let payloadType = 'any'
        let { name } = await prompt.ask([
          {
            type: 'input',
            name: 'name',
            message: `Action name`,
          },
        ])

        if (isBlank(name)) {
          print.error('Action name is required.')
          process.exit(0)
          return
        }

        let { type } = await prompt.ask([
          {
            type: 'input',
            name: 'type',
            message: `Action type (Leave blank -- we'll let you to pick it):`,
          },
        ])

        if (!type) {
          const actions = await reduxStore.reducerActions()
          const actionKeys = Object.keys(actions)

          const { actionKey } = await prompt.ask([
            {
              name: 'actionKey',
              message: 'Select action from',
              type: 'list',
              choices: actionKeys,
            },
          ])

          const selectedAction = actions[actionKey]
          const selectedTypes = selectedAction.map(a => a.type)

          const { actionType } = await prompt.ask([
            {
              name: 'actionType',
              message: 'Select type',
              type: 'list',
              choices: selectedTypes,
            },
          ])

          type = actionType

          const tp = selectedAction.find(f => f.type === actionType)
          payloadType = tp.payload
        }

        await reduxStore.createActionThunk(name, type, payloadType)
      }
    } else {
      await reduxStore.updateReducers()
      print.success('Store was successfully updated.')
    }
  },
}
