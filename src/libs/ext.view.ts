import { RootContext } from '.'
import { ViewInfo, BriefViewInfo, ViewType } from './types'
import { SyntaxKind } from 'ts-simple-ast'

type ViewKind = 'component' | 'screen'

class View {
  context: RootContext
  constructor(context: RootContext) {
    this.context = context
  }

  async createClassView(kind: ViewKind, name: string, props: any, location: string) {
    const {
      strings: { pascalCase, kebabCase },
      utils,
    } = this.context

    const fileList = ['index.tsx', 'props.tsx']
    if (props.withState) {
      fileList.push('state.tsx')
    }

    const targetPathBase = kind === 'screen' ? 'screens' : 'components'

    await utils.generate(
      'shared/src/views/class/',
      `src/views/${targetPathBase}${location}${kebabCase(name)}/`,
      fileList,
      {
        name: pascalCase(name + (kind === 'screen' ? 'Screen' : '')),
        ...props,
      },
    )
  }

  async createStatelessView(kind: ViewKind, name: string, functional: boolean, location: string) {
    const {
      strings: { pascalCase, kebabCase },
      utils,
    } = this.context

    const targetPathBase = kind === 'screen' ? 'screens' : 'components'

    await utils.generate(
      functional ? 'shared/src/views/stateless-functional/' : 'shared/src/views/stateless/',
      `src/views/${targetPathBase}${location}${kebabCase(name)}/`,
      ['index.tsx', 'props.tsx'],
      {
        name: pascalCase(name + (kind === 'screen' ? 'Screen' : '')),
      },
    )
  }

  async screenList(dir: string = ''): Promise<ViewInfo[]> {
    const {
      filesystem: { exists },
      utils,
      strings: { padEnd },
    } = this.context

    const dirs = await utils.dirNamesDeep(`src/views/screens${dir}`)
    const infoList: ViewInfo[] = []

    for (const d of dirs) {
      const file = `src/views/screens${d}/index.tsx`

      if (exists(file) === 'file') {
        const briefInfo = this.briefViewInfo(file)
        if (briefInfo) {
          infoList.push(<ViewInfo>{
            path: d,
            option: padEnd(briefInfo.name + ' ', 20, '─') + ' ' + d,
            ...briefInfo,
          })
        }
      }
    }

    return infoList
  }

  briefViewInfo(file: string): BriefViewInfo | undefined {
    const { utils } = this.context
    const { sourceFile } = utils.ast(file)
    if (!sourceFile) {
      return undefined
    }

    let info: BriefViewInfo

    sourceFile.getExportedDeclarations().forEach(e => {
      const identifier = e.getFirstChildByKind(SyntaxKind.Identifier)
      if (identifier) {
        let type: ViewType = 'class'
        switch (e.getLastChild().getKind()) {
          case SyntaxKind.Block:
            type = 'stateless'
            break
          case SyntaxKind.ArrowFunction:
            type = 'functional'
            break
        }

        info = {
          name: identifier.getText(),
          type,
        }
      }

      if (info) {
        e.forget()
      }
    })

    return info
  }
}

export function view(context: RootContext) {
  return new View(context)
}
