import { RootContext } from '../../../core/types'
import { ReducerGenerator } from '../../../generators/store/reducer-generator'
import { CreateReducerServiceQA } from './qa'

export class CreateReducerService {
  context: RootContext
  qa: CreateReducerServiceQA
  generator: ReducerGenerator

  constructor(context: RootContext) {
    this.context = context
    this.qa = new CreateReducerServiceQA(context)
    this.generator = new ReducerGenerator(context)
  }

  async run() {
    const args = await this.qa.run()
    await this.generator.generate(args)
  }
}
