import { ReactView } from '../../../core/libs/react-view'
import {
  FieldObject,
  RootContext,
  SetStateArgs,
  ViewTypeEnum
} from '../../../core/types'

export class StateServiceQA {
  context: RootContext
  constructor(context: RootContext) {
    this.context = context
  }

  async run(): Promise<SetStateArgs> {
    const cli = this.context.tools.cli()
    const selectedView = (await cli.browseViews()) as ReactView
    const existingState = selectedView.getState()
    const isHook = selectedView.type !== ViewTypeEnum.classComponent

    let fields: FieldObject[] = []
    if (existingState && existingState.fields.length) {
      fields = await cli.askFieldObjectsToBeRemoved(
        existingState.fields,
        isHook ? 'Select hooks to remove' : 'Select state fields to remove'
      )
    }

    const newFields = await cli.askFieldObjects(
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
