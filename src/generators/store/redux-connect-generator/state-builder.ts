import { Decorator, SyntaxKind } from 'ts-morph'
import { ReactView } from '../../../core/libs/react-view'
import { Reducer } from '../../../core/libs/reducer'
import { FieldObject } from '../../../core/types'

export class StateBuilder {
  private args: Array<FieldObject<string>>

  constructor(private view: ReactView, states: Array<FieldObject<Reducer>>) {
    const {
      strings: { camelCase, pascalCase }
    } = view.context
    this.args = states.map<FieldObject<string>>(s => ({
      name: camelCase(s.data.name) + pascalCase(s.name),
      data: `#state.${s.data.getCombinedAlias()}.${s.name}`,
      type: s.type
    }))
  }

  /**
   * Generate state props interface and import it to view.
   */
  generateProps() {
    if (!this.args.length) {
      return
    }

    const { tools } = this.view.context
    const viewProps = this.view.getOrCreateProps()
    const ts = tools.ts()

    // get or create state props interface in props file
    const statePropsName = this.propsName()
    const stateInterface = ts.getOrAddInterface(
      viewProps.sourceFile,
      statePropsName
    )

    // set the properties
    ts.setInterfaceProperties(stateInterface, this.args, false)

    // ensure props is extended to this state interface
    viewProps.extends(stateInterface)

    // ensure props is imported to view file
    this.view.addNamedImport(viewProps.sourceFile.getFilePath(), statePropsName)
  }

  /**
   * Build new state decorator argument
   * @param stateVarName 'state' variable name
   */
  argument(stateVarName: string = 'state'): string | undefined {
    if (!this.args.length) {
      return undefined
    }

    return `${stateVarName} => ({${this.args
      .map(f => `${f.name}: ${f.data}`)
      .join(', ')
      .replace(/#state/g, stateVarName)}})`
  }

  /**
   * Merge this state with existing decorator
   * @param decorator existing decorator
   */
  mergeDecorator(decorator: Decorator) {
    if (!this.args.length) {
      return
    }

    const pos = 0
    const ts = this.view.context.tools.ts()
    const existingArgs = decorator.getArguments()

    if (existingArgs && existingArgs.length > pos) {
      // merge existing state map initializer
      const arg = existingArgs[pos]

      const obj = arg.getFirstDescendantByKind(
        SyntaxKind.ObjectLiteralExpression
      )

      if (obj) {
        // found state assignments
        const identifier = arg.getFirstDescendantByKind(SyntaxKind.Identifier)

        ts.mergePropertyAssignments(
          obj,
          this.args.map(a => ({
            ...a,
            type: a.data.replace(/#state/g, identifier.getText())
          }))
        )
      } else {
        // thunk exists state is not
        arg.replaceWithText(this.argument())

        // update type arguments
        const typeArgs = decorator.getTypeArguments()
        if (!typeArgs.length) {
          decorator.addTypeArgument(this.propsName())
        } else {
          typeArgs[0].replaceWithText(this.propsName())
        }
      }
    } else {
      // create new argument
      decorator.addArgument(this.argument())
    }

    const existingTypeArgs = decorator.getTypeArguments()
    if (!existingTypeArgs || existingTypeArgs.length <= pos) {
      decorator.addTypeArgument(this.propsName())
    }
  }

  propsName() {
    const { naming } = this.view.context
    return naming.stateProps(this.view.name)
  }
}
