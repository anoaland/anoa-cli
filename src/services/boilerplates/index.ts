import { RootContext } from '../../libs'
import { Utils } from '../core/utils'
import { ExpoBoilerplate } from './expo'
import { ReactNativeInitBoilerplate } from './react-native-init'
import { ProjectTypes } from './types'

export class Boilerplate {
  context: RootContext
  utils: Utils

  constructor(context: RootContext) {
    this.context = context
    this.utils = new Utils(context)
  }

  /**
   * Initialize / generate new boilerplate
   * @param type project type
   * @param dir target directory
   */
  async init() {
    const {
      parameters: { first: dir },
      prompt
    } = this.context

    // ask user for project type
    const { type } = await prompt.ask([
      {
        name: 'type',
        message: 'Select project type you would like to use:',
        type: 'list',
        choices: [ProjectTypes.REACT_NATIVE_INIT, ProjectTypes.EXPO]
      }
    ])

    switch (type) {
      case ProjectTypes.EXPO:
        await new ExpoBoilerplate(this.context).init(dir)
        break

      case ProjectTypes.REACT_NATIVE_INIT:
        await new ReactNativeInitBoilerplate(this.context).init(dir)
        break

      default:
        this.utils.exit('Invalid project type.')
    }
  }
}
