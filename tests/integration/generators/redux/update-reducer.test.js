const tempy = require('tempy')
const { run, DOWN, ENTER, SPACE, TAB } = require('../../../runner')
const path = require('path')
const fs = require('fs-extra')

jest.setTimeout(10 * 60 * 1000)

describe('update reducer tests', () => {
  const FIXTURE = path.join(
    process.cwd(),
    'tests',
    'integration',
    'generators',
    'fixtures',
    'has-store-project'
  )

  const originalDir = process.cwd()
  let tempDir

  beforeEach(done => {
    tempDir = tempy.directory()
    fs.copySync(FIXTURE, tempDir)
    process.chdir(tempDir)
    done()
  })

  afterEach(done => {
    process.chdir(originalDir)
    fs.removeSync(tempDir)
    done()
  })

  test('should be able to add new state to reducer', async () => {
    await run(
      ['s', 's'],
      [
        // Select reducer
        ENTER,

        // Add new fields
        'state3',
        TAB,
        'any',
        TAB,
        '10',
        ENTER,

        // Add more fields
        'state4',
        TAB,
        'number',
        TAB,
        '333',
        ENTER,

        // end state
        ENTER,

        // auto generate action types from state
        'Y',

        // select action types to include',
        SPACE,
        DOWN,
        SPACE,
        ENTER
      ]
    )

    process.chdir('src/store/reducers/task')

    expect('index.ts').existsAndPrettySame(
      `import { Reducer } from 'redux'
import { TaskAction } from './actions'
import { TaskState } from './state'

export const TaskReducer: Reducer<TaskState, TaskAction> = (
  state = {
    state1: '',
    state2: 0,
    state3: 10,
    state4: 333
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
    case 'TASK/SET_STATE_3':
      return { ...state, state3: action.payload }
    case 'TASK/SET_STATE_4':
      return { ...state, state4: action.payload }
    default:
      return state
  }
}
`
    )

    expect('actions.ts').existsAndPrettySame(
      `export type TaskAction =
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
  | {
      type: 'TASK/SET_STATE_3'
      payload: any
    }
  | {
      type: 'TASK/SET_STATE_4'
      payload: number
    }
`
    )

    expect('state.ts').existsAndPrettySame(
      `export interface TaskState {
  state1: string
  state2: number
  state3: any
  state4: number
}
`
    )
  })

  test('should be able to add new action types to reducer', async () => {
    await run(
      ['s', 'a'],
      [
        // Select reducer
        ENTER,

        // Add new action type
        'new action',
        TAB,
        'any',
        ENTER,

        // Add more action type
        'setFoo',
        TAB,
        'number',
        ENTER,

        // stop add new action type
        ENTER
      ]
    )

    process.chdir('src/store/reducers/task')

    expect('index.ts').existsAndPrettySame(
      `import { Reducer } from 'redux'
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
    case 'TASK_REDUCER/NEW_ACTION':
      return { ...state }
    case 'TASK_REDUCER/SET_FOO':
      return { ...state }
    default:
      return state
  }
}
`
    )

    expect('actions.ts').existsAndPrettySame(
      `export type TaskAction =
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
  | {
      type: 'TASK_REDUCER/NEW_ACTION'
      payload: any
    }
  | {
      type: 'TASK_REDUCER/SET_FOO'
      payload: number
    }
`
    )

    expect('state.ts').existsAndPrettySame(
      `export interface TaskState {
  state1: string
  state2: number
}
`
    )
  })
})
