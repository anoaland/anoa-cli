import { ReactNativeBoilerplateArgs } from '../../../generators/boilerplates/react-native-init/types'
import { Utils } from '../../../generators/utils'
import { ValidateUtils } from '../../../generators/utils/validate'
import { RootContext } from '../../../libs'

export class ReactNativeInitBoilerplateServiceQA {
  context: RootContext
  validateUtils: ValidateUtils
  utils: Utils

  constructor(context: RootContext) {
    this.context = context
    this.validateUtils = new ValidateUtils(context)
    this.utils = new Utils(context)
  }

  async run(dir: string): Promise<ReactNativeBoilerplateArgs> {
    const { prompt } = this.context

    if (!dir) {
      ;({ projectDir: dir } = await prompt.ask({
        name: 'projectDir',
        type: 'input',
        message: 'Enter project directory',
        validate: val => this.validateUtils.dirName('Project directory', val)
      }))
    }

    return {
      dir
    }
  }
}
