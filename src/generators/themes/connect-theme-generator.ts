import * as path from 'path'
import { ReactView } from '../../core/libs/react-view'
import { ConnectThemeArgs, RootContext, ViewTypeEnum } from '../../core/types'

export class ConnectThemeGenerator {
  context: RootContext

  constructor(context: RootContext) {
    this.context = context
  }

  async generate(args: ConnectThemeArgs) {
    const {
      print: { spin, fancy, colors },
      tools
    } = this.context
    const spinner = spin('Generating...')

    const { views } = args
    for (const view of views) {
      await this.applyTheme(view)
    }

    await tools.source().save()
    spinner.succeed('Theme was successfully connected to:')
    fancy(
      views
        .map(
          v =>
            `  · ${colors.cyan(v.name)} on ${colors.yellow(
              tools.utils().relativePath(v.sourceFile.getFilePath())
            )}`
        )
        .join('\r\n')
    )
  }

  async applyTheme(view: ReactView) {
    let applied = false
    view.attach()

    const props = this.updateProps(view)
    this.updateImports(view)

    switch (view.type) {
      case ViewTypeEnum.classComponent:
        applied = this.applyThemeDecorator(view)
        break

      case ViewTypeEnum.functionComponent:
      case ViewTypeEnum.arrowFunctionComponent:
        applied = this.applyThemeHoc(view)
        break
    }

    if (!applied) {
      view.detach()
      props.detach()
    }
  }

  private applyThemeDecorator(view: ReactView): boolean {
    if (
      !view.setDecorator('AppStyle.withThemeClass', {
        name: 'AppStyle.withThemeClass()'
      })
    ) {
      return false
    }

    return true
  }

  private applyThemeHoc(view: ReactView): boolean {
    return view.setHoc('AppStyle.withTheme', () => 'AppStyle.withTheme')
  }

  private updateImports(view: ReactView) {
    const {
      folder,
      filesystem: { cwd }
    } = this.context

    view.addNamedImport(path.join(cwd(), folder.styles('index.ts')), 'AppStyle')
  }

  private updateProps(view: ReactView) {
    const {
      filesystem: { cwd },
      folder
    } = this.context

    const props = view.getOrCreateProps()
    props.extends('AppStyleProps', path.join(cwd(), folder.styles('index.ts')))
    return props
  }
}
