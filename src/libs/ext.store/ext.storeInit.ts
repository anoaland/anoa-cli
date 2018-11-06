import { RootContext } from '..'

export function storeInit(context: RootContext) {
  return async () => {
    const {
      init,
      npmEnsure,
      generateFiles,
      filesystem: { exists },
    } = context

    await init()
    await npmEnsure(false, ['anoa', 'react-redux', 'redux', 'redux-thunk'])
    await npmEnsure(true, ['@types/react-redux'])

    if (!(await exists('src/store/index.ts'))) {
      await generateFiles('shared/src/store/', ['index.ts'], 'src/store/')
    }
  }
}
