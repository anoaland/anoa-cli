import { GluegunRunContext } from 'gluegun'

module.exports = (context: GluegunRunContext) => {
  context.createClassView = async (kind: 'component' | 'screen', name, props) => {
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

  context.createStatelessView = async (kind: 'component' | 'screen', name, functional) => {
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
