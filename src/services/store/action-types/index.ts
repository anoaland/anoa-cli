import { RootContext } from '../../../core/types'
import { ActionTypesGenerator } from '../../../generators/store/action-types-generator'
import { AddActionTypesServiceQA } from './qa'

export class AddActionTypesService {
  context: RootContext
  qa: AddActionTypesServiceQA

  constructor(context: RootContext) {
    this.context = context
    this.qa = new AddActionTypesServiceQA(context)
  }

  async run() {
    const args = await this.qa.run()
    await new ActionTypesGenerator(this.context).generate(args)
  }
}
