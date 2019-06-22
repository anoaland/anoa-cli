import { FieldObject } from '../../../generators/types'
import { CliUtils } from '../../../generators/utils/cli'
import { ReactView } from '../../../generators/utils/react-view'
import { SetStateArgs, ViewTypeEnum } from '../../../generators/views/types'
import { RootContext } from '../../../tools/context'

export class StateServiceQA {
  context: RootContext
  cliUtils: CliUtils
  constructor(context: RootContext) {
    this.context = context
    this.cliUtils = new CliUtils(context)
  }

  async run(): Promise<SetStateArgs> {
    const selectedView = (await this.cliUtils.browseViews()) as ReactView
    const existingState = selectedView.getState()
    const isHook = selectedView.type !== ViewTypeEnum.classComponent

    let fields: FieldObject[] = []
    if (existingState && existingState.fields.length) {
      fields = await this.cliUtils.askFieldObjectsToBeRemoved(
        existingState.fields,
        isHook ? 'Select hooks to remove' : 'Select state fields to remove'
      )
    }

    const newFields = await this.cliUtils.askFieldObjects(
      isHook ? 'Add new hooks' : 'Add new state',
      !isHook,
      true
    )
    fields = [...fields, ...newFields]

    return {
      view: selectedView,
      fields,
      existingState
    }
  }
}
