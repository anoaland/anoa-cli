import { combineReducers } from 'redux'
import { TaskReducer } from './task'
import { TaskAction } from './task/actions'

export const reducers = combineReducers({
  task: TaskReducer
})

export type AppRootActions = TaskAction
export type AppRootState = ReturnType<typeof reducers>
