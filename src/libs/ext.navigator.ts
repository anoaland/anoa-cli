import { RootContext } from '.'
import { ViewInfo } from './types'

class Navigator {
  context: RootContext
  constructor(context: RootContext) {
    this.context = context
  }

  /**
   * Ensure all required navigator packages installed.
   */
  async init() {
    const { init, npm } = this.context

    await init()
    await npm.ensurePackages(['anoa', 'react-navigation@2.18.2'], false)
    await npm.ensurePackages(['@types/react-navigation'], true)
  }

  /**
   * Create new navigator
   * @param kind Navigator Kind
   * @param screen target screen
   * @param routes screens as routes
   */
  async create(kind: string, screen: ViewInfo, routes: ViewInfo[]) {
    const {
      strings: { pascalCase },
      utils,
    } = this.context

    const navPath = `views/screens${screen.path}`
    const name = pascalCase(screen.name) + 'Nav'
    const routeConfigMap = routes.map(c => `${c.name.substr(0, c.name.length - 6)}: ${c.name}`)
    const imports = routes.map(r => {
      return `import { ${r.name} } from '${utils.relative(`views/screens${r.path}`, navPath)}'`
    })

    imports.push(`import { create${kind} } from 'react-navigation'`)

    const props = {
      kind,
      name,
      routeConfigMap,
      imports: utils.sortImport(imports),
    }

    await this.init()

    await utils.generate('shared/src/nav/', `src/${navPath}`, ['nav.tsx'], props)
  }
}

export function navigator(context: RootContext) {
  return new Navigator(context)
}
