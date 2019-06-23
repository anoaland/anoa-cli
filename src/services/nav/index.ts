import { RootContext } from '../../core/types'
import { CreateNavigatorServiceQA } from './qa'

export class CreateNavigatorService {
  context: RootContext
  qa: CreateNavigatorServiceQA

  constructor(context: RootContext) {
    this.context = context
    this.qa = new CreateNavigatorServiceQA(this.context)
  }

  async run() {
    const args = await this.qa.run()
    const generator = new (await import(
      '../../generators/nav/navigator-generator'
    )).NavigatorGenerator(this.context)
    await generator.generate(args)
  }
}
