import {
  CreateComponentArgs,
  CreateComponentResult,
  ViewKindEnum,
  ViewTypeEnum
} from '../../../generators/views/types'
import { RootContext } from '../../../tools/context'
import { ViewServiceQA } from './qa'

export class ViewService {
  context: RootContext
  qa: ViewServiceQA

  constructor(context: RootContext, kind: ViewKindEnum) {
    this.context = context
    this.qa = new ViewServiceQA(context, kind)
  }

  async run() {
    const args = await this.qa.run()

    const {
      print: { spin, colors },
      strings: { lowerCase }
    } = this.context

    const spinner = spin('Generating...')
    let result: CreateComponentResult

    switch (args.type) {
      case ViewTypeEnum.classComponent:
        result = await this.generateClassComponent(args)
        break

      case ViewTypeEnum.functionComponent:
        result = await this.generateFunctionComponent(args)
        break

      case ViewTypeEnum.arrowFunctionComponent:
        result = await this.generateArrowFunctionComponent(args)
        break

      default:
        throw new Error('Not implemented')
    }

    spinner.succeed(
      `New ${colors.bold(args.name)} ${lowerCase(
        args.kind
      )} successfully created on ${colors.bold(result.path)}`
    )
  }

  private async generateClassComponent(args: CreateComponentArgs) {
    const { ClassComponentGenerator } = await import(
      '../../../generators/views/class-component-generator'
    )
    return await new ClassComponentGenerator(this.context).generate(args)
  }

  private async generateFunctionComponent(args: CreateComponentArgs) {
    const { FunctionComponentGenerator } = await import(
      '../../../generators/views/function-component-generator'
    )
    return await new FunctionComponentGenerator(this.context).generate(args)
  }

  private async generateArrowFunctionComponent(args: CreateComponentArgs) {
    const { ArrowFunctionComponentGenerator } = await import(
      '../../../generators/views/arrow-function-component-generator'
    )
    return await new ArrowFunctionComponentGenerator(this.context).generate(
      args
    )
  }
}
