import { RootContext } from '..'

export function storeCreateAction(context: RootContext) {
  return async (name: string, type: string) => {
    const {
      strings: { kebabCase, camelCase, isBlank },
      generateFiles,
      storeInit,
      print,
    } = context

    if (isBlank(name)) {
      print.error('Action name is required')
      process.exit(0)
    }

    if (isBlank(type)) {
      print.error('Action type is required')
      process.exit(0)
    }

    await storeInit()

    const props = {
      name,
      type,
      camelCase,
    }

    await generateFiles(
      'shared/src/store/actions/',
      ['action.ts'],
      `src/store/actions/`,
      props,
      `${kebabCase(name)}-action.ts`,
    )
  }
}
