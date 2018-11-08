import { RootContext } from '..'

export function dataInit(context: RootContext) {
  return async () => {
    const { init, npmEnsure, projectInfo } = context

    await init()

    const devPackages = []
    const packages = ['sqlite-ts']

    const info = await projectInfo()
    if (info.preset === 'react-native-init') {
      packages.push('react-native-sqlite-storage')
      devPackages.push('@types/react-native-sqlite-storage')
    }

    await npmEnsure(false, packages)
    if (devPackages.length > 0) {
      await npmEnsure(true, devPackages)
    }
  }
}
