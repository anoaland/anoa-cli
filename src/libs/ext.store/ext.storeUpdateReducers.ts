import { RootContext } from '..'

export function storeUpdateReducers(context: RootContext) {
  return async () => {
    const { generateFiles, storeReducerList } = context

    const reducers = await storeReducerList()
    await generateFiles('shared/src/store/reducers/', ['index.ts'], `src/store/reducers/`, {
      reducers,
    })
  }
}
