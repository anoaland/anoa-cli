import { RootContext } from '../../../core/types'
import { StateServiceQA } from './qa'

export class StateService {
  context: RootContext
  qa: StateServiceQA

  constructor(context: RootContext) {
    this.context = context
    this.qa = new StateServiceQA(context)
  }

  async run() {
    const args = await this.qa.run()

    const { StateGenerator } = await import(
      '../../../generators/views/state-generator'
    )
    const generator = new StateGenerator(this.context)
    await generator.generate(args)
  }
}
