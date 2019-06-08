import { ThunkAction } from 'redux-thunk'
import { ReduxStore } from './core'
import { AppRootActions, AppRootState, reducers } from './reducers'

export const AppStore = new ReduxStore<AppRootState, AppRootActions>(reducers)

export type AppThunkAction<TResult = void> = ThunkAction<
  TResult,
  AppRootState,
  undefined,
  AppRootActions
>
