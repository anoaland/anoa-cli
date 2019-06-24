import { RootContext } from '../../../core/types'
import { ConnectThemeServiceQA } from './qa'

export class ConnectThemeService {
  context: RootContext
  qa: ConnectThemeServiceQA

  constructor(context: RootContext) {
    this.context = context
    this.qa = new ConnectThemeServiceQA(this.context)
  }

  async run() {
    const {
      tools: { theme },
      print: { warning, newline, colors }
    } = this.context

    if (!theme().isBaseThemeExist()) {
      warning(
        `Theme module is not initialized. You should run ${colors.white(
          'anoa theme new'
        )} first to initialize theme.`
      )
      newline()
      return
    }

    const args = await this.qa.run()
    const generator = new (await import(
      '../../../generators/themes/connect-theme-generator'
    )).ConnectThemeGenerator(this.context)

    await generator.generate(args)
  }
}
