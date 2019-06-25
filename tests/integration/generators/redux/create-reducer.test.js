const tempy = require('tempy')
const { run, DOWN, ENTER, SPACE, TAB } = require('../../../runner')
const path = require('path')
const fs = require('fs-extra')

jest.setTimeout(10 * 60 * 1000)

describe('create reducer tests', () => {
  const FIXTURE = path.join(
    process.cwd(),
    'tests',
    'integration',
    'generators',
    'fixtures',
    'empty-project'
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

  test('should be able to create a reducer', async () => {
    await run(
      ['s', 'r', 'task'],
      [
        // Define reducer state
        'state1',
        TAB,
        'string',
        TAB,
        `''`,
        ENTER,

        // more state
        'state2',
        TAB,
        'number',
        TAB,
        `0`,
        ENTER,

        // end state
        ENTER,

        // auto generate action types from state
        'Y',

        // select action types to include',
        SPACE,
        DOWN,
        SPACE,
        ENTER,

        // Add more action types
        'anotherAction',
        TAB,
        'string',
        ENTER,

        // end action types
        ENTER
      ]
    )

    process.chdir('src/store')

    expect('core.tsx').isExists()

    expect('index.ts').existsAndPrettySame(
      `
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
      `
    )

    expect('reducers/index.ts').existsAndPrettySame(
      `
      import { combineReducers } from 'redux'
      import { TaskReducer } from './task'
      import { TaskAction } from './task/actions'
      
      export const reducers = combineReducers({
        task: TaskReducer
      })
      
      export type AppRootActions = TaskAction
      export type AppRootState = ReturnType<typeof reducers>      
      `
    )

    process.chdir('reducers/task')

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
