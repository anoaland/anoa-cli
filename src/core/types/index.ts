import { GluegunRunContext } from 'gluegun'
import { SourceFile } from 'ts-morph'
import { Extensions } from '../../extensions'
import { ReactView } from '../libs/react-view'

export type RootContext = GluegunRunContext &
  { [K in keyof Extensions]: ReturnType<Extensions[K]> }

export interface FieldObject<T = any> {
  name: string
  type: string
  optional: boolean
  initial?: string
  data?: T
}

export interface NameValue {
  name: string
  value: string
}

export type KeyValue<T = string> = { [key: string]: T }

export enum ViewTypeEnum {
  classComponent = 'Class',
  functionComponent = 'Function',
  arrowFunctionComponent = 'Arrow Function'
}

export enum ViewKindEnum {
  screen = 'Screen',
  component = 'Component'
}

export interface CreateComponentArgs {
  name: string
  kind: ViewKindEnum
  type: ViewTypeEnum
  location: string
  props: FieldObject[]
  state: FieldObject[]
}

export interface CreateComponentResult {
  path: string
}

export interface SetPropsArgs {
  view: ReactView
  fields: FieldObject[]
  existingProps: PropsInfo
}

export interface SetStateArgs {
  view: ReactView
  fields: FieldObject[]
  existingState: StateInfo
}

export interface PropsInfo {
  name: string
  fields: FieldObject[]
  sourceFile: SourceFile
}

export interface StateInfo {
  name?: string
  sourceFile?: SourceFile
  isHook: boolean
  fields: FieldObject[]
}

export enum NavigatorTypeEnum {
  stack = 'Stack Navigator',
  switch = 'Switch Navigator',
  drawer = 'Drawer Navigator',
  materialBottomTab = 'Material Bottom Tab Navigator',
  materialTopTab = 'Material Top Tab Navigator'
}

export interface CreateNavigatorArgs {
  name: string
  type: NavigatorTypeEnum
  screenToAttach?: ReactView
  routes: RouteViewInfo[]
  initialRoute: RouteViewInfo
}

export interface RouteViewInfo {
  screen: ReactView
  title: string
  routeName: string
}

export interface CreateThemeArgs {
  name: string
  filePath: string
  base: ThemeInfo
}

export interface ThemeInfo {
  name: string
  path: string
}

export interface ConnectThemeArgs {
  views: ReactView[]
  viewKind: ViewKindEnum
}

export interface AppProvider {
  /**
   * Provider full name. eg: AppStyle.Provider
   */
  name: string
  /**
   * Module specifier where this provider imported
   */
  moduleSpecifier: string
  /**
   * Statement you want to put on App.prepare() method
   */
  prepareStatement?: string
}

export interface CreateReducerArgs {
  name: string
  location: string
  stateFields: FieldObject[]
  stateActionTypes: FieldObject[]
  customActionTypes: FieldObject[]
}
