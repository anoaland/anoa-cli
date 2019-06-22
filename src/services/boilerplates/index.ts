import { ProjectTypes } from '../../config';
import { Utils } from '../../generators/utils';
import { RootContext } from '../../tools/context';
import { ExpoBoilerplateService } from './expo';
import { helps } from './helps';
import { ReactNativeInitBoilerplateService } from './react-native-init';

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
    this.utils.handlePrintHelps(helps, 'Generate new react native project')

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
        this.utils.exit('Invalid project type.')
    }
  }
}
