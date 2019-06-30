import { RootContext } from '../../core/types';
import { Utils } from '../core';
import { AddActionTypesService } from './action-types';
import { ReduxConnectService } from './connect';
import { TaskEnum } from './enums';
import { helps } from './help';
import { CreateReducerService } from './reducer';
import { AddReducerStateService } from './state';
import { CreateReduxThunkService } from './thunk';

export class StoreService {
  context: RootContext
  utils: Utils

  constructor(context: RootContext) {
    this.context = context
    this.utils = new Utils(context)
  }

  async build() {
    await this.queryUserInput()
  }

  async queryUserInput() {
    const {
      parameters: { first, options },
      prompt
    } = this.context

    let task: TaskEnum | string

    switch (first) {
      case 'r':
      case 'reducer':
        task = TaskEnum.createReducer
        break

      case 's':
      case 'state':
        task = TaskEnum.addNewReducerState
        break

      case 'a':
      case 'action':
        task = TaskEnum.addNewActionType
        break

      case 't':
      case 'thunk':
        task = TaskEnum.addNewThunk
        break

      case 'c':
      case 'connect':
        task = TaskEnum.connectToView
        break
    }

    if (options && (options.h || options.help)) {
      this.showHelp()
      return
    }

    if (!task) {
      const choices = [
        TaskEnum.createReducer,
        TaskEnum.addNewReducerState,
        TaskEnum.addNewActionType,
        TaskEnum.addNewThunk,
        TaskEnum.connectToView
      ]

      const { pickTask } = await prompt.ask([
        {
          name: 'pickTask',
          message: 'What would you like to do with store (redux)?',
          type: 'list',
          choices
        }
      ])
      task = pickTask
    }

    switch (task) {
      case TaskEnum.createReducer:
        await new CreateReducerService(this.context).run()
        break

      case TaskEnum.addNewReducerState:
        await new AddReducerStateService(this.context).run()
        break

      case TaskEnum.addNewActionType:
        await new AddActionTypesService(this.context).run()
        break

      case TaskEnum.addNewThunk:
        await new CreateReduxThunkService(this.context).run()
        break

      case TaskEnum.connectToView:
        await new ReduxConnectService(this.context).run()
        break

      default:
        this.showHelp()
    }
  }

  showHelp() {
    this.utils.printHelps(helps)
  }
}
