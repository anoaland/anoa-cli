import { GluegunRunContext } from 'gluegun'

module.exports = (context: GluegunRunContext) => {
  context.createClassComponent = async (name, props) => {
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
      `src/views/components/`,
      {
        name: pascalCase(name),
        ...props,
      },
      `${kebabCase(name)}.tsx`,
    )
  }

  context.createStatelessComponent = async (name, functional) => {
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
      name: pascalCase(name),
    }

    await generateFiles(
      'shared/src/views/components/',
      [functional ? 'stateless-functional-component.tsx' : 'stateless-component.tsx'],
      `src/views/components/`,
      props,
      `${kebabCase(name)}.tsx`,
    )
  }
}
