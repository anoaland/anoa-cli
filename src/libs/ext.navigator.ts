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
    const { npm } = this.context
    await npm.ensurePackages(['anoa', 'react-navigation@2.18.2'], false)
    await npm.ensurePackages(['@types/react-navigation'], true)
  }

  /**
   * Create new navigator
   * @param kind Navigator Kind
   * @param screen target screen
   * @param isReplaceRenderFunction replace render function
   * @param routes screens as routes
   */
  async create(
    kind: string,
    screen: ViewInfo,
    isReplaceRenderFunction: boolean,
    routes: ViewInfo[],
    initialRouteName: string,
  ) {
    const {
      strings: { pascalCase, snakeCase, startCase },
      utils,
    } = this.context

    const navPath = `views/screens${screen.path}`
    const name = pascalCase(screen.name) + 'Nav'
    const routeConfigMap = routes.map(c => {
      const screenName = c.name.substr(0, c.name.length - 6)
      return `${screenName}: { 
          screen: ${c.name},
          navigationOptions: {
            title: '${startCase(snakeCase(screenName).replace(/_/g, ' '))}'
          }
         }`
    })
    const imports = routes.map(r => {
      return `import { ${r.name} } from '${utils.relative(`views/screens${r.path}`, navPath)}'`
    })

    imports.push(`import { create${kind} } from 'react-navigation'`)

    const props = {
      kind,
      name,
      routeConfigMap,
      imports: utils.sortImport(imports),
      initialRouteName,
    }

    await this.init()

    await utils.generate('shared/src/nav/', `src/${navPath}`, ['nav.tsx'], props)

    if (isReplaceRenderFunction) {
      const viewFile = utils.ast(`src/${navPath}/index.tsx`)
      const defClass = viewFile.getDefaultExportedClass()

      viewFile.addNamedImports('./nav', [name])
      defClass.getMethod('render').setBodyText(`return <View style={{flex:1}}><${name}/></View>`)
      viewFile.sortImports()
      viewFile.save()
    }
  }
}

export function navigator(context: RootContext) {
  return new Navigator(context)
}
