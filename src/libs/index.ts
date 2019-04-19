import { GluegunRunContext } from 'gluegun'
import * as extensions from './extensions'
type Extentions = typeof extensions

type RootContext = GluegunRunContext &
  { [K in keyof Extentions]: ReturnType<Extentions[K]> }

export { RootContext, extensions }
