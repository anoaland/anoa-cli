import { ReactView } from '../../../core/libs/react-view'
import { FieldObject, RootContext, SetPropsArgs } from '../../../core/types'

export class PropsServiceQA {
  context: RootContext
  constructor(context: RootContext) {
    this.context = context
  }

  async run(): Promise<SetPropsArgs> {
    const cli = this.context.tools.cli()
    const selectedView = (await cli.browseViews()) as ReactView
    const existingProps = selectedView.getProps()

    let fields: FieldObject[] = []
    if (existingProps && existingProps.fields.length) {
      fields = await cli.askFieldObjectsToBeRemoved(
        existingProps.fields,
        'Select props fields to remove'
      )
    }

    const newFields = await cli.askFieldObjects('Add new props')
    fields = [...fields, ...newFields]

    return {
      view: selectedView,
      fields,
      existingProps
    }
  }
}
