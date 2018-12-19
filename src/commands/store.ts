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
    const taskAddActionCreator = 'Add new action creator'
    const taskUpdate = 'Update AppStore'
    const taskConnect = 'Connect store to view'
    const taskAddReducerStateFields = 'Add new fields into existing state'

    let task = undefined
    const stateAndThunks = await reduxStore.getReducerAndThunks()
    const hasStore = !!stateAndThunks.states || !!stateAndThunks.thunks

    switch (first) {
      case 'r':
        task = taskCreateReducer
        break
      case 'a':
        task = taskAddActionCreator
        break
      case 'u':
        task = taskUpdate
        break
      case 'c':
        task = taskConnect
        break
      case 's':
        task = taskAddReducerStateFields
    }

    if (!task) {
      const choices = [
        taskCreateReducer,
        taskAddReducerStateFields,
        taskAddActionCreator,
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

    if (task === taskAddReducerStateFields) {
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
            message: 'Reducer name:',
          },
        ])

        const { states } = await prompt.ask([
          {
            type: 'input',
            name: 'states',
            message: `State fields (separated with space, eg: foo:string='some value' bar:number=26), or leave it blank, we'll create an example for you:`,
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
