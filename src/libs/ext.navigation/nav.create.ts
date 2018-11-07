import { RootContext } from '..'
import { ScreenInfo } from '../types'

export function navigationCreate(context: RootContext) {
  return async (kind: string, screen: ScreenInfo, routes: ScreenInfo[]) => {
    const {
      strings: { pascalCase },
      relative,
      navigationInit,
      generateFiles,
      sortImport,
    } = context

    const navPath = `views/screens${screen.path}`
    const name = pascalCase(screen.name) + 'Nav'
    const routeConfigMap = routes.map(c => `${c.name.substr(0, c.name.length - 6)}: ${c.name}`)
    const imports = routes.map(r => {
      return `import { ${r.name} } from '${relative(`views/screens${r.path}`, navPath)}'`
    })

    imports.push(`import { create${kind} } from 'react-navigation'`)

    const props = {
      kind,
      name,
      routeConfigMap,
      imports: sortImport(imports),
    }

    await navigationInit()

    await generateFiles('shared/src/nav/', ['nav.tsx'], `src/${navPath}`, props, '/nav.tsx')
  }
}
