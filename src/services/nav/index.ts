import { RootContext } from '../../libs'
import { Utils } from '../core'
import { CreateNavigatorBuilder } from './builders/create-navigator'
import { TaskEnum } from './enums'
import { helps } from './help'

export class NavigationService {
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
      case 'n':
      case 'new':
        task = TaskEnum.createNavigator
        break
    }

    if (options && (options.h || options.help)) {
      this.showHelp()
      return
    }

    if (!task) {
      const choices = [TaskEnum.createNavigator]

      const { pickTask } = await prompt.ask([
        {
          name: 'pickTask',
          message: 'What would you like to do with nav?',
          type: 'list',
          choices
        }
      ])
      task = pickTask
    }

    switch (task) {
      case TaskEnum.createNavigator:
        await new CreateNavigatorBuilder(this.context).build()
        break

      default:
        this.showHelp()
    }
  }

  showHelp() {
    this.utils.printHelps(helps)
  }
}
