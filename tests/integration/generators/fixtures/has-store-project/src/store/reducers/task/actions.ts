export type TaskAction =
  | {
      type: 'TASK/SET_STATE_1'
      payload: string
    }
  | {
      type: 'TASK/SET_STATE_2'
      payload: number
    }
  | {
      type: 'TASK/ANOTHER_ACTION'
      payload: string
    }
