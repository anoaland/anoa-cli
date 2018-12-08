import { RootContext } from '.'
import { ViewInfo, BriefViewInfo, ViewType, ViewKind } from './types'
import { SyntaxKind, PropertyAccessExpression } from 'ts-simple-ast'

class View {
  context: RootContext
  constructor(context: RootContext) {
    this.context = context
  }

  async createClassView(kind: ViewKind, name: string, path: string, props: any, location: string) {
    const { utils } = this.context
    const fileList = ['index.tsx', 'props.ts']

    if (props.withState) {
      fileList.push('state.ts')
    }

    const targetPathBase = kind === 'screen' ? 'screens' : 'components'

    await utils.generate(
      'shared/src/views/class/',
      `src/views/${targetPathBase}${location}${path}/`,
      fileList,
      {
        name,
        ...props,
      },
    )
  }

  async createStatelessView(
    kind: ViewKind,
    name: string,
    path: string,
    functional: boolean,
    location: string,
  ) {
    const { utils } = this.context
    const targetPathBase = kind === 'screen' ? 'screens' : 'components'

    await utils.generate(
      functional ? 'shared/src/views/stateless-functional/' : 'shared/src/views/stateless/',
      `src/views/${targetPathBase}${location}${path}/`,
      ['index.tsx', 'props.ts'],
      {
        name,
      },
    )
  }

  async createViewState() {
    const {
      prompt,
      print,
      view,
      utils,
      strings: { pascalCase },
    } = this.context

    const { kind } = await prompt.ask({
      name: 'kind',
      message: 'What kind of view would you like to have state on it?',
      type: 'list',
      choices: ['Component', 'Screen'],
    })

    const dir = `src/views/${kind.toLowerCase()}s`
    const viewInfoList = (await view.viewInfoList(kind.toLowerCase())).filter(
      v => v.type === 'class',
    )

    if (!viewInfoList.length) {
      print.error(`We could not find any ${kind} class in this project.`)
      process.exit(0)
      return
    }

    const { target } = await prompt.ask({
      name: 'target',
      message: `Now select the ${kind}:`,
      type: 'list',
      choices: viewInfoList.map(v => v.option),
    })

    const viewInfo = viewInfoList.find(v => v.option === target)
    const { name, path } = viewInfo
    const viewDir = dir + path

    await utils.generate('shared/src/views/class/', `${viewDir}/`, ['state.ts'], {
      name: pascalCase(name),
    })

    const ast = utils.ast(`${viewDir}/index.tsx`)
    const clazz = ast.sourceFile.getClass(name)

    const extReactComponent = clazz.getExtends().getFirstChild(c => {
      return (
        c.getKind() === SyntaxKind.PropertyAccessExpression && c.getText().endsWith('Component')
      )
    }) as PropertyAccessExpression

    if (!extReactComponent) {
      throw new Error('Can not find React.Component extend.')
    }

    const gn = extReactComponent.getNextSiblings().find(c => {
      return c.getKind() === SyntaxKind.SyntaxList
    })

    const generics = (gn ? gn.getText() : 'any').split(',')

    const stateName = `${name}State`
    if (generics.length === 1) {
      generics.push(stateName)
    }

    if (gn) {
      gn.replaceWithText(generics.join(','))
    } else {
      extReactComponent.replaceWithText(`${extReactComponent.getText()}<${generics.join(',')}>`)
    }

    ast.addNamedImports('./state', [`${name}State`])
    ast.sortImports()
    ast.save()
  }

  async viewInfoList(kind: 'component' | 'screen', dir: string = ''): Promise<ViewInfo[]> {
    const {
      filesystem: { exists },
      utils,
    } = this.context

    const dirs = await utils.dirNamesDeep(`src/views/${kind}s${dir}`)
    const infoList: ViewInfo[] = []

    for (const d of dirs) {
      const file = `src/views/${kind}s${d}/index.tsx`

      if (exists(file) === 'file') {
        const briefInfo = this.briefViewInfo(file)
        if (briefInfo) {
          infoList.push(<ViewInfo>{
            path: d,
            option: `${briefInfo.name} [${d.substr(1, d.length - 1)}]`,
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
          case SyntaxKind.PropertyAccessExpression:
          case SyntaxKind.CallExpression:
            type = 'hoc'
            break
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
