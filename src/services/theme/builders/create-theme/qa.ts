import * as path from 'path'
import { RootContext } from '../../../../libs'
import { Utils } from '../../../core'
import { ProjectBrowser, ThemeInfo } from '../../../core/project-browser'

export class CreateThemeBuilderQA {
  context: RootContext
  utils: Utils
  result: CreateThemeBuilderQAResult
  projectBrowser: ProjectBrowser

  constructor(context: RootContext) {
    this.context = context
    this.utils = new Utils(context)
    this.projectBrowser = new ProjectBrowser(context)
  }

  async run() {
    const {
      prompt,
      filesystem: { exists, cwd },
      folder,
      strings: { kebabCase },
      print: { colors },
      naming
    } = this.context

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
            this.utils.relativePath(themePath)
          )} is already exists. Please try different name.`
        }

        return true
      }
    })
    themeName = naming.theme(themeName)

    const base = await this.projectBrowser.browseThemes('Select parent theme')

    this.result = {
      name: themeName,
      filePath: themePath,
      base
    }
  }
}

export interface CreateThemeBuilderQAResult {
  name: string
  filePath: string
  base: ThemeInfo
}
