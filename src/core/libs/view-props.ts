import { InterfaceDeclaration } from 'ts-morph'
import { FieldObject, PropsInfo, RootContext } from '../types'
import { Lib } from './lib'
import { ReactView } from './react-view'

export class ViewProps extends Lib implements PropsInfo {
  name: string
  fields: Array<FieldObject<any>>
  view: ReactView

  constructor(context: RootContext, view: ReactView, info: PropsInfo) {
    super(context)
    this.view = view
    this.fields = info.fields
    this.sourceFile = info.sourceFile
    this.name = info.name
  }

  extends(moduleName: string, modulePath?: string) {
    const { tools } = this.context

    const ts = tools.ts()

    ts.extendsInterface(this.interface(), moduleName)
    if (modulePath) {
      ts.addNamedImport(this.sourceFile, modulePath, moduleName)
    }
  }

  interface(): InterfaceDeclaration {
    return this.sourceFile.getInterface(this.name)
  }
}
