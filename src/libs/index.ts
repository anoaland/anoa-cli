import * as extensions from './types'
import { GluegunRunContext } from 'gluegun'
type TExt = typeof extensions

export type RootContext = GluegunRunContext & { [K in keyof TExt]: ReturnType<TExt[K]> }

export default extensions
