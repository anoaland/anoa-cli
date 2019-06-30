import { RootContext } from '../../../core/types'
import { ExpoBoilerplateGenerator } from '../../../generators/boilerplates/expo'
import { ExpoBoilerplateArgs } from '../../../generators/boilerplates/expo/types'
import { ExpoBoilerplateServiceQA } from './qa'

export class ExpoBoilerplateService {
  context: RootContext
  args: ExpoBoilerplateArgs
  qa: ExpoBoilerplateServiceQA
  generator: ExpoBoilerplateGenerator

  constructor(context: RootContext) {
    this.context = context
    this.generator = new ExpoBoilerplateGenerator(context)
    this.qa = new ExpoBoilerplateServiceQA(context)
  }

  /**
   * Generate expo project boilerplate.
   * @param projectDir project directory
   */
  async run(projectDir: string) {
    await this.generator.validate()
    const args = await this.qa.run(projectDir)
    await this.generator.generate(args)
  }
}
