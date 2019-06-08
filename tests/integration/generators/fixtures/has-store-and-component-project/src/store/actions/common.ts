import { AppThunkAction } from '..'

export function setStateTwoAction(payload: number): AppThunkAction {
  return async dispatch => {
    dispatch({ type: 'TASK/SET_STATE_2', payload })
  }
}
