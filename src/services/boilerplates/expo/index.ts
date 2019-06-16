import { ExpoBoilerplateGenerator } from '../../../generators/boilerplates/expo'
import { ExpoBoilerplateArgs } from '../../../generators/boilerplates/expo/types'
import { RootContext } from '../../../libs'
import { Utils } from '../../core'
import { ExpoBoilerplateServiceQA } from './qa'

export class ExpoBoilerplateService {
  context: RootContext
  utils: Utils
  args: ExpoBoilerplateArgs
  qa: ExpoBoilerplateServiceQA
  provider: ExpoBoilerplateGenerator

  constructor(context: RootContext) {
    this.context = context
    this.utils = new Utils(context)
    this.provider = new ExpoBoilerplateGenerator(context)
    this.qa = new ExpoBoilerplateServiceQA(context)
  }

  /**
   * Generate expo project boilerplate.
   * @param projectDir project directory
   */
  async run(projectDir: string) {
    await this.provider.validate()
    const args = await this.qa.run(projectDir)
    await this.provider.generate(args)
  }
}
