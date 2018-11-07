import { RootContext } from '.'
import { ScreenInfo } from './types'

export function createClassView(context: RootContext) {
  return async (kind: 'component' | 'screen', name: string, props: any, location: string) => {
    const {
      strings: { pascalCase, kebabCase },
      generateFiles,
    } = context

    const fileList = ['index.tsx', 'props.tsx']
    if (props.withState) {
      fileList.push('state.tsx')
    }

    const targetPathBase = kind === 'screen' ? 'screens' : 'components'

    await generateFiles(
      'shared/src/views/class/',
      fileList,
      `src/views/${targetPathBase}${location}${kebabCase(name)}/`,
      {
        name: pascalCase(name + (kind === 'screen' ? 'Screen' : '')),
        ...props,
      },
    )
  }
}

export function createStatelessView(context: RootContext) {
  return async (
    kind: 'component' | 'screen',
    name: string,
    functional: boolean,
    location: string,
  ) => {
    const {
      strings: { pascalCase, kebabCase },
      generateFiles,
    } = context

    const targetPathBase = kind === 'screen' ? 'screens' : 'components'

    await generateFiles(
      functional ? 'shared/src/views/stateless-functional/' : 'shared/src/views/stateless/',
      ['index.tsx', 'props.tsx'],
      `src/views/${targetPathBase}${location}${kebabCase(name)}/`,
      {
        name: pascalCase(name + (kind === 'screen' ? 'Screen' : '')),
      },
    )
  }
}

export function screenList(context: RootContext) {
  const {
    filesystem: { exists },
    dirNamesDeep,
    astIsScreenFile,
    strings: { padEnd },
  } = context

  return async (dir: string = '') => {
    const dirs = await dirNamesDeep(`src/views/screens${dir}`)
    const files: ScreenInfo[] = []

    for (const d of dirs) {
      const file = `src/views/screens${d}/index.tsx`

      if (exists(file) === 'file') {
        const screen = await astIsScreenFile(file)
        if (screen) {
          files.push(<ScreenInfo>{
            name: screen,
            path: d,
            option: padEnd(screen + ' ', 20, '─') + ' ' + d,
          })
        }
      }
    }

    return files
  }
}
