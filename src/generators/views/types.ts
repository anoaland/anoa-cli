import { FieldObject } from '../types'
import { PropsInfo, ReactView, StateInfo } from '../utils/react-view'

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
