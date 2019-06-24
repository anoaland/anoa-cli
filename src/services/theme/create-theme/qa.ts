import * as path from 'path'
import { CreateThemeArgs, RootContext } from '../../../core/types'

export class CreateThemeServiceQA {
  context: RootContext

  constructor(context: RootContext) {
    this.context = context
  }

  async run(): Promise<CreateThemeArgs> {
    const {
      prompt,
      filesystem: { exists, cwd },
      folder,
      strings: { kebabCase },
      print: { colors },
      naming,
      tools
    } = this.context

    const utils = tools.utils()
    const theme = tools.theme()

    let themePath: string
    let { themeName } = await prompt.ask({
      name: 'themeName',
      message: 'Enter name of theme',
      type: 'input',
      validate: val => {
        if (!val) {
          return 'Name of theme is required'
        }

        themePath = path.join(
          cwd(),
          folder.themes(kebabCase(naming.theme(val)) + '.ts')
        )

        if (exists(themePath)) {
          return `The ${colors.yellow(
            utils.relativePath(themePath)
          )} is already exists. Please try different name.`
        }

        return true
      }
    })
    themeName = naming.theme(themeName)

    const base = await theme.selectTheme('Select parent theme')

    return {
      name: themeName,
      filePath: themePath,
      base
    }
  }
}
