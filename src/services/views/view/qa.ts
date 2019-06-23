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
      strings: { pascalCase, isBlank, lowerCase, kebabCase },
      folder,
      tools
    } = this.context

    // resolve name
    let name = parameters.first
    if (!name) {
      ;({ name } = await prompt.ask({
        type: 'input',
        name: 'name',
        message: `${pascalCase(this.kind)} name`,
        validate: val => {
          return isBlank(val) ? 'name is required' : true
        }
      }))
    }

    // resolve location

    const rootDir =
      this.kind === ViewKindEnum.screen ? folder.screens() : folder.components()
    let location = '/'
    const project = tools.project()
    const dirs = project.dirListDeep(rootDir)

    if (dirs && dirs.length > 0) {
      dirs.splice(0, 0, '/')
      ;({ location } = await prompt.ask({
        name: 'location',
        message: `Folder/location (relative to ${rootDir}):`,
        type: 'autocomplete',
        choices: dirs,
        initial: '/'
      }))
    }
    location = path.join(rootDir, location, kebabCase(name))

    // resolve type

    let type: ViewTypeEnum | any
    ;({ type } = await prompt.ask({
      name: 'type',
      message: `What ${lowerCase(this.kind)} type do you prefer?`,
      type: 'select',
      choices: [
        ViewTypeEnum.classComponent,
        ViewTypeEnum.functionComponent,
        ViewTypeEnum.arrowFunctionComponent
      ],
      initial: ViewTypeEnum.classComponent
    }))

    const cli = tools.cli()

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
