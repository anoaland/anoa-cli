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

  /**
   * Extends this view to another interface
   * @param extendTo extend to interface
   * @param partial is partial? default is true
   */
  extends(extendTo: InterfaceDeclaration, partial?: boolean): void

  /**
   * Extends this view to another interface with specified path
   * @param extendTo interface name
   * @param modulePath interface path to import
   */
  extends(extendTo: string, modulePath: string): void

  extends(
    extendTo: string | InterfaceDeclaration,
    modulePath?: string | boolean
  ): void {
    const { tools } = this.context

    const ts = tools.ts()

    if (typeof extendTo === 'string') {
      ts.extendsInterface(this.interface(), extendTo)
      if (modulePath) {
        ts.addNamedImport(this.sourceFile, modulePath as string, extendTo)
      }
    } else {
      const extTo =
        modulePath === undefined || modulePath === true
          ? `Partial<${extendTo.getName()}>`
          : extendTo.getName()
      ts.extendsInterface(this.interface(), extTo)
    }
  }

  interface(): InterfaceDeclaration {
    return this.sourceFile.getInterface(this.name)
  }
}
