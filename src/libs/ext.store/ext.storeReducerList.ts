import { RootContext } from '..'

export function storeReducerList(context: RootContext) {
  return async () => {
    const {
      strings: { camelCase, pascalCase, kebabCase },
      storeReducerObjectList,
    } = context
    return (await storeReducerObjectList()).map(r => ({
      name: camelCase(r.name),
      val: pascalCase(r.name),
      dir: kebabCase(r.name),
    }))
  }
}
