import React from 'react'
import {
  connect,
  InferableComponentEnhancerWithProps,
  MapDispatchToPropsParam,
  MapStateToPropsParam,
  Provider
} from 'react-redux'
import {
  Action,
  applyMiddleware,
  createStore,
  Middleware,
  Reducer,
  Store
} from 'redux'
import thunk, { ThunkDispatch } from 'redux-thunk'

/**
 * Redux store class builder.
 */
export class ReduxStore<
  TState,
  TAction extends Action,
  ThunkDispatchFn = ThunkDispatch<TState, undefined, TAction>
> {
  reducer!: Reducer<TState, TAction>
  store!: Store<TState & {}, TAction> & { dispatch: {} }

  constructor(reducer: Reducer<TState, TAction>) {
    this.reducer = reducer
  }

  /**
   * Initialze app store. Call this once before using Store.Provider.
   * @param param state and middlewares
   */
  async init(param: InitStoreParameter<TState>): Promise<void>

  /**
   * Initialze app store. Call this once before using Store.Provider.
   * @param getInitialState Async function to to get the initial app state.
   * @param beforeMiddleware Redux Middleware before thunk middleware get called.
   * @param afterMiddleware Redux middleware after thunk middleware get called.
   */
  async init(
    getInitialState?: () => Promise<Partial<TState>>,
    beforeMiddleware?: Middleware<{}, TState> | Array<Middleware<{}, TState>>,
    afterMiddleware?: Middleware<{}, TState> | Array<Middleware<{}, TState>>
  ): Promise<void>

  async init(
    param?: (() => Promise<Partial<TState>>) | InitStoreParameter<TState>,
    beforeMiddleware?: Middleware<{}, TState> | Array<Middleware<{}, TState>>,
    afterMiddleware?: Middleware<{}, TState> | Array<Middleware<{}, TState>>
  ): Promise<void> {
    let initialState: Partial<TState> = {}

    // evaluate function parameters
    if (typeof param === 'function') {
      initialState = await param()
    } else if (typeof param === 'object') {
      initialState = param.initialState
        ? typeof param.initialState === 'function'
          ? await param.initialState()
          : param.initialState
        : {}
      beforeMiddleware = param.beforeMiddleware
      afterMiddleware = param.afterMiddleware
    }

    // build middlewares
    const middlewares: Middleware[] = []
    if (beforeMiddleware instanceof Array) {
      middlewares.push(...beforeMiddleware)
    } else if (beforeMiddleware) {
      middlewares.push(beforeMiddleware)
    }

    middlewares.push(thunk)

    if (afterMiddleware instanceof Array) {
      middlewares.push(...afterMiddleware)
    } else if (afterMiddleware) {
      middlewares.push(afterMiddleware)
    }

    // apply middlewares and create store
    const middleware = applyMiddleware(...middlewares)
    this.store = createStore(
      this.reducer as any,
      initialState as any,
      middleware as any
    )
  }

  /**
   * Store provider that wraps your root application.
   */
  Provider: React.SFC = ({ children }) => (
    <Provider store={this.store}>{children}</Provider>
  )

  /**
   * Store HOC.
   * @param mapStateToProps Map local state to store state
   * @param mapDispatchToProps Map local action to store action
   */
  withStore<TStateProps = {}, TDispatchProps = {}, TOwnProps = {}>(
    mapStateToProps?: MapStateToPropsParam<TStateProps, TOwnProps, TState>,
    mapDispatchToProps?: (
      dispatch: ThunkDispatchFn,
      ownProps: TOwnProps
    ) => MapDispatchToPropsParam<TDispatchProps, TOwnProps>
  ): InferableComponentEnhancerWithProps<
    TStateProps & TDispatchProps,
    TOwnProps
  > {
    return connect(
      mapStateToProps,
      mapDispatchToProps as any
    )
  }

  /**
   * Store class decorator.
   * @param mapStateToProps Map local state to store state
   * @param mapDispatchToProps Map local action to store action
   */
  withStoreClass<TStateProps = {}, TDispatchProps = {}, TOwnProps = {}>(
    mapStateToProps?: MapStateToPropsParam<TStateProps, TOwnProps, TState>,
    mapDispatchToProps?: (
      dispatch: ThunkDispatchFn,
      ownProps: TOwnProps
    ) => MapDispatchToPropsParam<TDispatchProps, TOwnProps>
  ): ClassDecorator {
    return (target: any) =>
      this.withStore(mapStateToProps, mapDispatchToProps as any)(target) as any
  }
}

export interface InitStoreParameter<TState> {
  initialState?: (() => Promise<Partial<TState>>) | Partial<TState>
  beforeMiddleware?: Middleware<{}, TState> | Array<Middleware<{}, TState>>
  afterMiddleware?: Middleware<{}, TState> | Array<Middleware<{}, TState>>
}
