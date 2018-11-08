export interface ScreenInfo {
  name: string
  path: string
  option: string
}

/**
 * Project info stored on package.json
 */
export interface AnoaProjectInfo {
  preset: 'expo' | 'react-native-init',
  withStore: boolean
}