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
