import { RootContext } from '../../../core/types'
import { ReduxConnectGenerator } from '../../../generators/store/redux-connect-generator'
import { ReduxConnectServiceQA } from './qa'

export class ReduxConnectService {
  private context: RootContext
  private qa: ReduxConnectServiceQA

  constructor(context: RootContext) {
    this.context = context
    this.qa = new ReduxConnectServiceQA(context)
  }

  async run() {
    const args = await this.qa.run()
    const generator = new ReduxConnectGenerator(this.context)
    await generator.generate(args)
  }
}
