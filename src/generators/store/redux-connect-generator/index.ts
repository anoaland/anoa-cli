import { ReactView } from '../../../core/libs/react-view'
import {
  ReduxConnectArgs,
  RootContext,
  ViewTypeEnum
} from '../../../core/types'
import { StateBuilder } from './state-builder'
import { ThunkBuilder } from './thunk-builder'

export class ReduxConnectGenerator {
  private context: RootContext
  private args: ReduxConnectArgs

  constructor(context: RootContext) {
    this.context = context
  }

  async generate(args: ReduxConnectArgs) {
    this.args = args
    const {
      print: { spin },
      tools: { source }
    } = this.context
    const spinner = spin('Generating....')

    for (const view of args.views) {
      await this.connectToView(view)
    }

    await source().save()

    spinner.succeed('Done')
  }

  private async connectToView(view: ReactView) {
    const {
      strings: { lowerCase },
      print: { spin, colors }
    } = this.context

    const spinner = spin(
      `Connecting store to ${colors.yellow(view.name)} ${lowerCase(
        view.kind
      )}...`
    )

    view.attach()

    const stateBuilder = new StateBuilder(view, this.args.states)
    const thunkBuilder = new ThunkBuilder(view, this.args.thunks)

    // Generate state props interface and import to view
    stateBuilder.generateProps()

    // Generate action props interface and import to view.
    thunkBuilder.generateProps()

    // this.generateActionProps(view)
    this.updateComponent(view, stateBuilder, thunkBuilder)

    spinner.succeed(
      `Store was successfully connected to ${colors.yellow(
        view.name
      )} ${lowerCase(view.kind)} on ${colors.bold(view.relativePath())}`
    )
  }

  /**
   * Update view to connect
   * @param view view to connect
   */
  private updateComponent(
    view: ReactView,
    stateBuilder: StateBuilder,
    thunkBuilder: ThunkBuilder
  ) {
    const { folder } = this.context
    view.addNamedImport(folder.store(), 'AppStore')

    switch (view.type) {
      case ViewTypeEnum.classComponent:
        this.updateClassComponent(view, stateBuilder, thunkBuilder)
        break
      case ViewTypeEnum.functionComponent:
      case ViewTypeEnum.arrowFunctionComponent:
        this.updateFunctionalComponent(view, stateBuilder, thunkBuilder)
        break
    }
  }

  private updateClassComponent(
    view: ReactView,
    stateBuilder: StateBuilder,
    thunkBuilder: ThunkBuilder
  ) {
    const decorator = view.getDecorator('AppStore.withStoreClass')
    if (!decorator) {
      const { args, typeArgs } = this.buildNewArgs(stateBuilder, thunkBuilder)
      view.addDecorator({
        name: `AppStore.withStoreClass<${typeArgs.join(',')}>`,
        arguments: args
      })
    } else {
      stateBuilder.mergeExpression(decorator)
      thunkBuilder.mergeExpression(decorator)
    }
  }

  private updateFunctionalComponent(
    view: ReactView,
    stateBuilder: StateBuilder,
    thunkBuilder: ThunkBuilder
  ) {
    view.setHoc(
      'AppStore.withStore',
      hoc => {
        if (hoc) {
          // found existing hoc
          stateBuilder.mergeExpression(hoc)
          thunkBuilder.mergeExpression(hoc)
          return hoc.getText()
        } else {
          // create new statement
          const { args, typeArgs } = this.buildNewArgs(
            stateBuilder,
            thunkBuilder
          )
          return `AppStore.withStore<${typeArgs.join(',')}>(${args.join(',')})`
        }
      },
      true
    )
  }

  private buildNewArgs(stateBuilder: StateBuilder, thunkBuilder: ThunkBuilder) {
    const args: string[] = []
    const typeArgs: string[] = []
    const stateArg = stateBuilder.argument()
    if (stateArg) {
      args.push(stateArg)
      typeArgs.push(stateBuilder.propsName())
    }
    const thunkArg = thunkBuilder.argument()
    if (thunkArg) {
      if (!stateArg) {
        args.push('null')
        typeArgs.push('null')
      }
      args.push(thunkArg)
      typeArgs.push(thunkBuilder.propsName())
    }

    return { args, typeArgs }
  }
}
