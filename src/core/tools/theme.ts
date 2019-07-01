import * as path from 'path'
import { Project } from 'ts-morph'
import { RootContext, ThemeInfo } from '../types'

export class ThemeTools {
  context: RootContext

  constructor(context: RootContext) {
    this.context = context
  }

  isBaseThemeExist() {
    const {
      filesystem: { exists },
      folder
    } = this.context
    return exists(folder.styles('index.ts'))
  }

  /**
   * If found only one theme then return it, otherwise
   * prompt user to select theme.
   * @param message prompt message
   */
  async selectTheme(
    message: string = 'Select theme'
  ): Promise<ThemeInfo | null> {
    const project = new Project()
    const {
      folder,
      filesystem: { cwd },
      prompt
    } = this.context
    const stylesFile = project.addExistingSourceFile(
      path.join(cwd(), folder.styles('index.ts'))
    )

    const themes = stylesFile
      .getImportDeclarations()
      .filter(i => {
        return i
          .getModuleSpecifier()
          .getText()
          .startsWith(`'./themes/`)
      })
      .map<ThemeInfo>(i => ({
        name: i.getNamedImports()[0].getText(),
        path: path.join(
          cwd(),
          folder.themes(
            /'.\/themes\/(.*)'$/g.exec(i.getModuleSpecifier().getText())[1] +
              '.ts'
          )
        )
      }))

    if (!themes.length) {
      return null
    }

    if (themes.length === 1) {
      return themes[0]
    }

    const themesMap = themes.reduce((acc, cur) => {
      acc[cur.name] = cur
      return acc
    }, {})

    // BaseTheme should be first
    const choices = Object.keys(themesMap).filter(i => i !== 'BaseTheme')
    choices.splice(0, 0, 'BaseTheme')

    const { selectedTheme } = await prompt.ask({
      name: 'selectedTheme',
      choices,
      type: 'select',
      message,
      validate(val) {
        if (!val) {
          return 'Please select a theme.'
        }

        return true
      }
    })

    return themesMap[selectedTheme]
  }
}
