import { RootContext } from '../../../core/types'
import { PropsServiceQA } from './qa'

export class PropsService {
  context: RootContext
  qa: PropsServiceQA

  constructor(context: RootContext) {
    this.context = context
    this.qa = new PropsServiceQA(context)
  }

  async run() {
    const args = await this.qa.run()
    const { PropsGenerator } = await import(
      '../../../generators/views/props-generator'
    )
    const generator = new PropsGenerator(this.context)
    await generator.generate(args)
  }
}
