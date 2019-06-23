import * as path from 'path'
import { RootContext } from '../../../core/types'
import {
  CreateComponentArgs,
  ViewKindEnum,
  ViewTypeEnum
} from '../../../core/types'

export class ViewServiceQA {
  context: RootContext
  kind: ViewKindEnum

  constructor(context: RootContext, kind: ViewKindEnum) {
    this.context = context
    this.kind = kind
  }

  async run(): Promise<CreateComponentArgs> {
    const {
      prompt,
      parameters,
      strings: { pascalCase, kebabCase },
      folder,
      tools
    } = this.context

    const validate = tools.validate()

    // resolve name
    let name = parameters.first
    if (!name) {
      ;({ name } = await prompt.ask({
        type: 'input',
        name: 'name',
        message: `${pascalCase(this.kind)} name`,
        validate: val => {
          return validate.notEmpty('name', val)
        }
      }))
    }

    const cli = tools.cli()

    // resolve location
    const rootDir =
      this.kind === ViewKindEnum.screen ? folder.screens() : folder.components()
    let location = await cli.selectFolder(rootDir)

    location = path.join(location, kebabCase(name))

    // resolve type
    const type = await cli.selectViewType(this.kind)

    // resolve props
    const props = await cli.askFieldObjects('Props')

    const isClass = type === ViewTypeEnum.classComponent
    // resolve state
    const state = await cli.askFieldObjects(
      isClass ? 'State' : 'Hooks',
      isClass,
      true
    )

    return {
      name,
      location,
      kind: this.kind,
      props,
      state,
      type
    }
  }
}
