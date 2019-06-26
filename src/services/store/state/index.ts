import { RootContext } from '../../../core/types'
import { ReducerStateGenerator } from '../../../generators/store/reducer-state-generator'
import { AddReducerStateServiceQA } from './qa'

export class AddReducerStateService {
  context: RootContext
  qa: AddReducerStateServiceQA

  constructor(context: RootContext) {
    this.context = context
    this.qa = new AddReducerStateServiceQA(context)
  }

  async run() {
    const args = await this.qa.run()
    await new ReducerStateGenerator(this.context).generate(args)
  }
}
