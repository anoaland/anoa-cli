import { RootContext } from '../../libs'
import { Utils } from '../core'
import { ConnectThemeBuilder } from './builders/connect-theme'
import { CreateThemeBuilder } from './builders/create-theme'
import { TaskEnum } from './enums'
import { helps } from './help'

export class ThemeService {
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
        task = TaskEnum.createTheme
        break

      case 'c':
      case 'connect':
        task = TaskEnum.connectTheme
        break
    }

    if (options && (options.h || options.help)) {
      this.showHelp()
      return
    }

    if (!task) {
      const choices = [TaskEnum.createTheme, TaskEnum.connectTheme]

      const { pickTask } = await prompt.ask([
        {
          name: 'pickTask',
          message: 'What would you like to do with theme?',
          type: 'list',
          choices
        }
      ])
      task = pickTask
    }

    switch (task) {
      case TaskEnum.createTheme:
        await new CreateThemeBuilder(this.context).build()
        break

      case TaskEnum.connectTheme:
        await new ConnectThemeBuilder(this.context).build()
        break

      default:
        this.showHelp()
    }
  }

  showHelp() {
    this.utils.printHelps(helps)
  }
}
