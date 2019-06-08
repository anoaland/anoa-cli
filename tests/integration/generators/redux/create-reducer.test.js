const tempy = require('tempy')
const { run, DOWN, ENTER, SPACE, TAB } = require('../../../runner')
const path = require('path')
const fs = require('fs-extra')
const { filesystem } = require('gluegun')
const { Project } = require('ts-morph')

jest.setTimeout(10 * 60 * 1000)

describe('create reducer tests', () => {
  // const ANOA = path.join(process.cwd(), 'bin', 'anoa')
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
})
