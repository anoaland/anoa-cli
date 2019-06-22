import { FieldObject } from '../../../generators/types'
import { CliUtils } from '../../../generators/utils/cli'
import { ReactView } from '../../../generators/utils/react-view'
import { SetPropsArgs } from '../../../generators/views/types'
import { RootContext } from '../../../tools/context'

export class PropsServiceQA {
  context: RootContext
  cliUtils: CliUtils
  constructor(context: RootContext) {
    this.context = context
    this.cliUtils = new CliUtils(context)
  }

  async run(): Promise<SetPropsArgs> {
    const selectedView = (await this.cliUtils.browseViews()) as ReactView
    const existingProps = selectedView.getProps()

    let fields: FieldObject[] = []
    if (existingProps && existingProps.fields.length) {
      fields = await this.cliUtils.askFieldObjectsToBeRemoved(
        existingProps.fields,
        'Select props fields to remove'
      )
    }

    const newFields = await this.cliUtils.askFieldObjects('Add new props')
    fields = [...fields, ...newFields]

    return {
      view: selectedView,
      fields,
      existingProps
    }
  }
}
