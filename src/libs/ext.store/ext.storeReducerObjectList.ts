import { RootContext } from '..'

export function storeReducerObjectList(context: RootContext) {
  return async () => {
    return await context.dirList('src/store/reducers')
  }
}
