import { RootContext } from '..'

export function navigationInit(context: RootContext) {
  return async () => {
    const { init, npmEnsure } = context

    await init()
    await npmEnsure(false, ['anoa', 'react-navigation'])
    await npmEnsure(true, ['@types/react-navigation'])
  }
}
