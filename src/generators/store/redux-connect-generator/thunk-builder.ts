import * as path from 'path'
import { CallExpression, Decorator, SyntaxKind } from 'ts-morph'
import { ReactView } from '../../../core/libs/react-view'
import { FieldObject, ThunkInfo } from '../../../core/types'

export class ThunkBuilder {
  private args: Array<FieldObject<ThunkInfo>>

  constructor(private view: ReactView, thunks: ThunkInfo[]) {
    const {
      strings: { camelCase, pascalCase }
    } = view.context
    this.args = thunks.map<FieldObject<ThunkInfo>>(t => {
      const thunkParams = t.parameters.map(p => p.name).join(', ')

      return {
        name:
          camelCase(path.basename(t.path.replace(/.ts$/, ''))) +
          pascalCase(t.name.replace(/Action$/g, '')),
        type: `(${thunkParams}) => #dispatch(${t.name}(${thunkParams}))`,
        data: t
      }
    })
  }

  /**
   * Generate action props interface and import to view.
   */
  generateProps() {
    if (!this.args.length) {
      return
    }

    const { tools } = this.view.context

    const viewProps = this.view.getOrCreateProps()
    const ts = tools.ts()

    // get or create action props interface in props file
    const actionPropsName = this.propsName()
    const actionInterface = ts.getOrAddInterface(
      viewProps.sourceFile,
      actionPropsName
    )

    // set the properties
    ts.setInterfaceProperties(
      actionInterface,
      this.args.map<FieldObject>(t => {
        const { parameters, returnType } = t.data
        // build arrow function from thunk parameters
        const type = `(${
          parameters.length
            ? parameters
                .map(p => `${p.name}${p.optional ? '?' : ''}: ${p.type}`)
                .join(', ')
            : ''
        }) => ${returnType}`

        return {
          name: t.name,
          type
        }
      }),
      false
    )

    // ensure props is extended to this state interface
    viewProps.extends(actionInterface)

    // ensure props is imported to view file
    this.view.addNamedImport(
      viewProps.sourceFile.getFilePath(),
      actionPropsName
    )

    // ensure thunk actions are imported to view file
    for (const thunk of this.args.map(a => a.data)) {
      this.view.addNamedImport(thunk.path, thunk.name)
    }
  }

  /**
   * Build new action call/decorator argument
   * @param actionVarName 'dispatch' variable name
   */
  argument(actionVarName: string = 'dispatch'): string {
    if (!this.args.length) {
      return undefined
    }

    return `${actionVarName} => ({${this.args
      .map(f => `${f.name}: ${f.type}`)
      .join(', ')
      .replace(/#dispatch/g, actionVarName)}})`
  }

  /**
   * Merge this state with existing call/decorator
   * @param decorator existing call/decorator
   */
  mergeExpression(decorator: Decorator | CallExpression) {
    if (!this.args.length) {
      return
    }

    const pos = 1
    const ts = this.view.context.tools.ts()
    const existingArgs = decorator.getArguments() || []

    if (existingArgs.length > pos) {
      const arg = existingArgs[pos]

      // resolve 'dispatch' var name
      const identifier = arg
        .getFirstDescendantByKind(SyntaxKind.Identifier)
        .getText()

      const obj = arg.getFirstDescendantByKind(
        SyntaxKind.ObjectLiteralExpression
      )

      ts.mergePropertyAssignments(
        obj,
        this.args.map(a => ({
          ...a,
          type: a.type.replace(/#dispatch/g, identifier)
        }))
      )
    } else {
      if (!existingArgs.length) {
        // state arg is null
        decorator.addArgument('null')
      }

      // add this argument
      decorator.addArgument(this.argument())

      const typeArgs = decorator.getTypeArguments().map(t => t.getText())
      if (!typeArgs.length) {
        // state type is null
        decorator.addTypeArgument('null')
      }

      if (typeArgs.length <= pos) {
        // add this state type
        decorator.addTypeArgument(this.propsName())
      }
    }
  }

  /**
   * action props name
   */
  propsName() {
    const { naming } = this.view.context
    return naming.actionProps(this.view.name)
  }
}
