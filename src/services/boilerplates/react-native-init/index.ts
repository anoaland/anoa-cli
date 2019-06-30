import { RootContext } from '../../../core/types'
import { ReactNativeInitBoilerplateGenerator } from '../../../generators/boilerplates/react-native-init'
import { ReactNativeBoilerplateArgs } from '../../../generators/boilerplates/react-native-init/types'
import { ReactNativeInitBoilerplateServiceQA } from './qa'

export class ReactNativeInitBoilerplateService {
  context: RootContext
  info: ReactNativeBoilerplateArgs
  generator: ReactNativeInitBoilerplateGenerator
  qa: ReactNativeInitBoilerplateServiceQA

  constructor(context: RootContext) {
    this.context = context
    this.generator = new ReactNativeInitBoilerplateGenerator(context)
    this.qa = new ReactNativeInitBoilerplateServiceQA(context)
  }

  /**
   * Initialize new react-native project
   * @param projectDir project directory (optional)
   */
  async run(projectDir: string) {
    await this.generator.validate()
    const args = await this.qa.run(projectDir)
    await this.generator.generate(args)
  }
}
