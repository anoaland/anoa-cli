import { GluegunRunContext } from 'gluegun'

module.exports = (context: GluegunRunContext) => {
  context.createClassView = async (kind: 'component' | 'screen', name, props) => {
    const {
      print,
      strings: { isBlank, pascalCase, kebabCase },
      generateFiles,
    } = context

    if (isBlank(name)) {
      print.error('Component name is required.')
      process.exit(0)
      return
    }

    await generateFiles(
      'shared/src/views/components/',
      ['class-component.tsx'],
      kind === 'component' ? `src/views/components/` : `src/views/screens/`,
      {
        name: pascalCase(name + (kind === 'screen' ? 'Screen' : '')),
        ...props,
      },
      `${kebabCase(name)}.tsx`,
    )
  }

  context.createStatelessView = async (kind: 'component' | 'screen', name, functional) => {
    const {
      print,
      strings: { isBlank, pascalCase, kebabCase },
      generateFiles,
    } = context

    if (isBlank(name)) {
      print.error('Component name is required.')
      process.exit(0)
      return
    }

    const props = {
      name: pascalCase(name + (kind === 'screen' ? 'Screen' : '')),
    }

    await generateFiles(
      'shared/src/views/components/',
      [functional ? 'stateless-functional-component.tsx' : 'stateless-component.tsx'],
      kind === 'component' ? `src/views/components/` : `src/views/screens/`,
      props,
      `${kebabCase(name)}.tsx`,
    )
  }
}
