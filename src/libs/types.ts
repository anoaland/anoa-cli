export type ViewType = 'class' | 'stateless' | 'functional'

export interface ExportedNamePath {
  name: string
  path: string
}

export interface BriefViewInfo {
  name: string
  type: ViewType
}

export interface ViewInfo extends BriefViewInfo {
  path: string
  option: string
}

/**
 * Project info stored on package.json
 */
export interface AnoaProjectInfo {
  name: string
  preset: 'expo' | 'react-native-init'
}
