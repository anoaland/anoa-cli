import { RootContext } from '..'
import { Utils } from './utils'

export function utils(context: RootContext) {
  return new Utils(context)
}
