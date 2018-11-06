import { RootContext } from '.'

export function createClassView(context: RootContext) {
  return async (kind: 'component' | 'screen', name: string, props: any) => {
    const {
      strings: { pascalCase },
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
      `src/views/${targetPathBase}/${name}/`,
      {
        name: pascalCase(name + (kind === 'screen' ? 'Screen' : '')),
        ...props,
      },
    )
  }
}

export function createStatelessView(context: RootContext) {
  return async (kind: 'component' | 'screen', name: string, functional: boolean) => {
    const {
      strings: { pascalCase },
      generateFiles,
    } = context

    const targetPathBase = kind === 'screen' ? 'screens' : 'components'

    await generateFiles(
      functional ? 'shared/src/views/stateless-functional/' : 'shared/src/views/stateless/',
      ['index.tsx', 'props.tsx'],
      `src/views/${targetPathBase}/${name}/`,
      {
        name: pascalCase(name + (kind === 'screen' ? 'Screen' : '')),
      },
    )
  }
}
