const tempy = require('tempy')
const { run, DOWN, ENTER, SPACE, TAB } = require('../../../runner')
const path = require('path')
const fs = require('fs-extra')
const { filesystem } = require('gluegun')
const { Project } = require('ts-morph')

jest.setTimeout(10 * 60 * 1000)

describe('update reducer tests', () => {
  // const ANOA = path.join(process.cwd(), 'bin', 'anoa')
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

    const { exists, cwd } = filesystem
    const tsConfigFilePath = path.join(cwd(), 'tsconfig.json')
    expect(exists(tsConfigFilePath)).toBeTruthy()

    const project = new Project({
      tsConfigFilePath
    })

    process.chdir('src/store/reducers/task')

    // files are exists
    expect(exists('index.ts')).toBeTruthy()
    expect(exists('actions.ts')).toBeTruthy()
    expect(exists('state.ts')).toBeTruthy()

    const taskReducerFile = project.addExistingSourceFile('index.ts')
    expect(taskReducerFile.getText()).toEqual(
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
      return { ...state }
    case 'TASK/SET_STATE_4':
      return { ...state }
    default:
      return state
  }
}
`
    )

    const taskActionsFile = project.addExistingSourceFile('actions.ts')
    expect(taskActionsFile.getText()).toEqual(
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

    const taskStateFile = project.addExistingSourceFile('state.ts')
    expect(taskStateFile.getText()).toEqual(
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

    const { exists, cwd } = filesystem
    const tsConfigFilePath = path.join(cwd(), 'tsconfig.json')
    expect(exists(tsConfigFilePath)).toBeTruthy()

    const project = new Project({
      tsConfigFilePath
    })

    process.chdir('src/store/reducers/task')

    // files are exists
    expect(exists('index.ts')).toBeTruthy()
    expect(exists('actions.ts')).toBeTruthy()
    expect(exists('state.ts')).toBeTruthy()

    const taskReducerFile = project.addExistingSourceFile('index.ts')
    expect(taskReducerFile.getText()).toEqual(
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

    const taskActionsFile = project.addExistingSourceFile('actions.ts')
    expect(taskActionsFile.getText()).toEqual(
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

    const taskStateFile = project.addExistingSourceFile('state.ts')
    expect(taskStateFile.getText()).toEqual(
      `export interface TaskState {
  state1: string
  state2: number
}
`
    )
  })

  test('should be able to add new thunk', async () => {
    await run(
      ['s', 't'],
      [
        // Name of thunk
        'setStateTwo',
        ENTER,

        // file name
        'common',
        ENTER,

        // Do you want to generate thunk from reducer?
        ENTER, // Y

        // select reducer
        ENTER,

        // Select an action type
        DOWN,
        ENTER
      ]
    )

    const { exists, cwd } = filesystem
    const tsConfigFilePath = path.join(cwd(), 'tsconfig.json')
    expect(exists(tsConfigFilePath)).toBeTruthy()

    const project = new Project({
      tsConfigFilePath
    })

    process.chdir('src/store/actions')

    // files are exists
    expect(exists('common.ts')).toBeTruthy()

    const thunkFile = project.addExistingSourceFile('common.ts')
    expect(thunkFile.getText()).toEqual(
      `import { AppThunkAction } from '..'

export function setStateTwoAction(payload: number): AppThunkAction {
  return async dispatch => {
    dispatch({ type: 'TASK/SET_STATE_2', payload })
  }
}
`
    )
  })
})
