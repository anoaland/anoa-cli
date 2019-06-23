import { ProjectTypes } from '../../config'
import { RootContext } from '../../core/types'
import { ExpoBoilerplateService } from './expo'
import { helps } from './helps'
import { ReactNativeInitBoilerplateService } from './react-native-init'

export class Boilerplate {
  context: RootContext

  constructor(context: RootContext) {
    this.context = context
  }

  /**
   * Initialize / generate new boilerplate
   * @param type project type
   * @param dir target directory
   */
  async init() {
    const utils = this.context.tools.utils()
    utils.handlePrintHelps(helps, 'Generate new react native project')

    const {
      parameters: { first: dir, options },
      prompt
    } = this.context

    let type: ProjectTypes | string

    // get project type from cli options
    if (options[ProjectTypes.EXPO] === true) {
      type = ProjectTypes.EXPO
    } else if (options[ProjectTypes.REACT_NATIVE_INIT]) {
      type = ProjectTypes.REACT_NATIVE_INIT
    }

    // otherwise ask user
    if (!type) {
      ;({ type } = await prompt.ask([
        {
          name: 'type',
          message: 'Select project type you would like to use:',
          type: 'list',
          choices: [ProjectTypes.REACT_NATIVE_INIT, ProjectTypes.EXPO]
        }
      ]))
    }

    // process
    switch (type) {
      case ProjectTypes.EXPO:
        await new ExpoBoilerplateService(this.context).run(dir)
        break

      case ProjectTypes.REACT_NATIVE_INIT:
        await new ReactNativeInitBoilerplateService(this.context).run(dir)
        break

      default:
        utils.exit('Invalid project type.')
    }
  }
}
