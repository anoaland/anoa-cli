import { RootContext } from '../../libs'
import { Utils } from '../core'
import { ViewBuilder } from './builders/view-builder'
import { TaskEnum, ViewKindEnum, ViewTypeEnum } from './enums'
import { helps } from './help'

export class ViewService {
  context: RootContext
  kind: ViewKindEnum
  type: ViewTypeEnum
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
      case 'c':
      case 'component':
        task = TaskEnum.createComponent
        break
      case 's':
      case 'screen':
        task = TaskEnum.createScreen
        break
      case 'e':
      case 'state':
        task = TaskEnum.addState
    }

    if (options && (options.h || options.help)) {
      this.showHelp()
      return
    }

    if (!task) {
      const choices = [
        TaskEnum.createComponent,
        TaskEnum.createScreen,
        TaskEnum.addState
      ]

      const { pickTask } = await prompt.ask([
        {
          name: 'pickTask',
          message: 'What would you like to do with view?',
          type: 'list',
          choices
        }
      ])
      task = pickTask
    }

    if (task === TaskEnum.createComponent || task === TaskEnum.createScreen) {
      const builder = new ViewBuilder(
        this.context,
        task === TaskEnum.createComponent
          ? ViewKindEnum.component
          : ViewKindEnum.screen
      )

      await builder.build()
    }
  }

  showHelp() {
    this.utils.printHelps(helps)
  }
}
