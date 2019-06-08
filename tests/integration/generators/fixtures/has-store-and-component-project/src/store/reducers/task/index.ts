import { Reducer } from 'redux'
import { TaskAction } from './actions'
import { TaskState } from './state'

export const TaskReducer: Reducer<TaskState, TaskAction> = (
  state = {
    state1: '',
    state2: 0
  },
  action
) => {
  switch (action.type) {
    case 'TASK/SET_STATE_1':
      return { ...state, state1: action.payload }
    case 'TASK/SET_STATE_2':
      return { ...state, state2: action.payload }
    case 'TASK/ANOTHER_ACTION':
      return { ...state }
    default:
      return state
  }
}
