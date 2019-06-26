import { RootContext } from '../../../core/types'
import { ReduxThunkGenerator } from '../../../generators/store/redux-thunk-generator'
import { CreateReduxThunkServiceQA } from './qa'

export class CreateReduxThunkService {
  private context: RootContext
  private qa: CreateReduxThunkServiceQA

  constructor(context: RootContext) {
    this.context = context
    this.qa = new CreateReduxThunkServiceQA(context)
  }

  async run() {
    const args = await this.qa.run()
    await new ReduxThunkGenerator(this.context).generate(args)
  }
}
