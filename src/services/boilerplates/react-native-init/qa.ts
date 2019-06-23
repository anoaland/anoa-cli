import { RootContext } from '../../../core/types'
import { ReactNativeBoilerplateArgs } from '../../../generators/boilerplates/react-native-init/types'

export class ReactNativeInitBoilerplateServiceQA {
  context: RootContext

  constructor(context: RootContext) {
    this.context = context
  }

  async run(dir: string): Promise<ReactNativeBoilerplateArgs> {
    const { prompt, tools } = this.context

    if (!dir) {
      ;({ projectDir: dir } = await prompt.ask({
        name: 'projectDir',
        type: 'input',
        message: 'Enter project directory',
        validate: val => tools.validate().dirName('Project directory', val)
      }))
    }

    return {
      dir
    }
  }
}
