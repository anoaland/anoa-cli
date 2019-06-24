import { RootContext } from '../../../core/types'
import { CreateThemeServiceQA } from './qa'

export class CreateThemeService {
  context: RootContext
  qa: CreateThemeServiceQA

  constructor(context: RootContext) {
    this.context = context
    this.qa = new CreateThemeServiceQA(this.context)
  }

  async run() {
    const { tools } = this.context
    if (!tools.theme().isBaseThemeExist()) {
      await this.initBaseTheme()
    } else {
      await this.buildChildTheme()
    }
  }

  async buildChildTheme() {
    const args = await this.qa.run()
    const generator = new (await import(
      '../../../generators/themes/create-theme-generator'
    )).CreateThemeGenerator(this.context)

    await generator.generate(args)
  }

  async initBaseTheme() {
    const generator = new (await import(
      '../../../generators/themes/init-theme-generator'
    )).InitThemeGenerator(this.context)

    await generator.generate()
  }
}
