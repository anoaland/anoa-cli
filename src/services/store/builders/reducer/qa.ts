import { FieldObject } from '../../../../generators/types'
import { RootContext } from '../../../../tools/context'
import { ObjectBuilder, Utils } from '../../../core'

export class ReducerQA implements ReducerProps {
  context: RootContext
  utils: Utils
  name: string
  location: string
  objectBuilder: ObjectBuilder
  stateFields: FieldObject[]
  stateActionTypes: FieldObject[]
  customActionTypes: FieldObject[]

  constructor(context: RootContext) {
    this.context = context
    this.utils = new Utils(context)
    this.objectBuilder = new ObjectBuilder(context)
    this.stateFields = []
    this.stateActionTypes = []
    this.customActionTypes = []
  }

  async run() {
    const {
      filesystem: { exists },
      parameters: { second },
      strings: { isBlank, kebabCase },
      folder,
      prompt,
      print: { colors }
    } = this.context

    this.name = second

    const prompts = []
    if (!this.name) {
      prompts.push({
        type: 'input',
        name: 'name',
        message: `Reducer name`,
        validate: (val: string) => {
          return isBlank(val) ? 'reducer name is required' : true
        }
      })
    }

    // const rootDir =
    let name: string

    if (prompts.length) {
      const q = await prompt.ask(prompts)
      name = q.name
    }

    this.name = name || this.name
    this.location = folder.reducers(kebabCase(this.name))

    if (exists(this.location)) {
      this.utils.exit(
        `Can't create store since ${colors.bold(
          this.location
        )} is already exists.`
      )
      return
    }

    await this.queryStateFields()
    await this.queryGenerateActionsBasedOnState()
    await this.queryNewActionTypes()
  }

  private async queryStateFields() {
    const { print } = this.context
    print.fancy(print.colors.yellow(`• Define reducer state:`))
    this.stateFields = await this.objectBuilder.queryUserInput(true)
  }

  private async queryGenerateActionsBasedOnState() {
    this.stateActionTypes = await this.objectBuilder.queryReduxActionsBasedOnState(
      this.name,
      this.stateFields
    )
  }

  private async queryNewActionTypes() {
    const message = this.stateFields.length
      ? 'Add more action types'
      : 'Define action types'
    const { print } = this.context
    print.fancy(print.colors.yellow(`• ${message}:`))
    this.customActionTypes = await this.objectBuilder.queryReduxActionTypesInput(
      this.name
    )
  }
}

export interface ReducerProps {
  name: string
  location: string
  objectBuilder: ObjectBuilder
  stateFields: FieldObject[]
  stateActionTypes: FieldObject[]
  customActionTypes: FieldObject[]
}
