import { GluegunRunContext } from 'gluegun'
import * as extensions from './extensions'
type Extensions = typeof extensions

type RootContext = GluegunRunContext &
  { [K in keyof Extensions]: ReturnType<Extensions[K]> }

export { RootContext, extensions }
