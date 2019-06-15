import * as path from 'path'
import { RootContext } from '../../../libs'
import { Utils } from '../../core'
import { ViewKindEnum, ViewTypeEnum } from '../enums'
import { ViewArrowFunctionBuilder } from './view-arrow-functional-builder'
import { ViewClassBuilder } from './view-class-builder'
import { ViewFunctionBuilder } from './view-function-builder'

export class ViewBuilder {
  context: RootContext
  kind: ViewKindEnum
  type: ViewTypeEnum
  utils: Utils
  name: string
  location: string

  constructor(context: RootContext, kind: ViewKindEnum) {
    this.context = context
    this.kind = kind
    this.utils = new Utils(context)
  }

  async build() {
    await this.queryUserInput()
    await this.generate()
  }

  async queryUserInput() {
    const {
      filesystem: { exists },
      parameters: { second },
      strings: { pascalCase, isBlank, kebabCase, lowerCase },
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
        message: `${pascalCase(this.kind)} name`,
        validate: val => {
          return isBlank(val) ? 'name is required' : true
        }
      })
    }

    const rootDir =
      this.kind === ViewKindEnum.screen ? folder.screens() : folder.components()
    const dirs = this.utils.dirNamesDeep(rootDir)

    if (dirs && dirs.length > 0) {
      dirs.splice(0, 0, '/')
      prompts.push({
        name: 'location',
        message: `Folder/location (relative to ${rootDir}):`,
        type: 'autocomplete',
        choices: dirs,
        initial: '/'
      })
    }

    prompts.push({
      name: 'type',
      message: `What ${lowerCase(this.kind)} type do you prefer:`,
      type: 'list',
      choices: [
        ViewTypeEnum.classComponent,
        ViewTypeEnum.functionComponent,
        ViewTypeEnum.arrowFunctionComponent
      ],
      initial: ViewTypeEnum.classComponent
    })

    const { name, location, type } = await prompt.ask(prompts)

    this.name = name || this.name
    this.location = path.join(rootDir, location || '/', kebabCase(this.name))
    this.type = (type as ViewTypeEnum) || this.type

    if (exists(this.location)) {
      this.utils.exit(
        `Can't create view because ${colors.bold(
          this.location
        )} folder is already exists.`
      )
    }
  }

  async generate() {
    switch (this.type) {
      case ViewTypeEnum.classComponent:
        new ViewClassBuilder(
          this.context,
          this.name,
          this.kind,
          this.location
        ).build()
        break

      case ViewTypeEnum.functionComponent:
        new ViewFunctionBuilder(
          this.context,
          this.name,
          this.kind,
          this.location
        ).build()
        break

      case ViewTypeEnum.arrowFunctionComponent:
        new ViewArrowFunctionBuilder(
          this.context,
          this.name,
          this.kind,
          this.location
        ).build()
        break
    }
  }
}
