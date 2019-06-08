const tempy = require('tempy')
const { run, DOWN, ENTER, TAB } = require('../../../runner')
const path = require('path')
const fs = require('fs-extra')
const { filesystem } = require('gluegun')
const { Project } = require('ts-morph')

jest.setTimeout(10 * 60 * 1000)

describe('thunk tests', () => {
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

  test('should be able to add new thunk from reducer', async () => {
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
        ENTER,

        // Should returns Promise? / YES
        'n'
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
  return dispatch => {
    dispatch({ type: 'TASK/SET_STATE_2', payload })
  }
}
`
    )
  })

  test('should be able to add new async thunk from reducer', async () => {
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
        ENTER,

        // Should returns Promise? / YES
        'y'
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

export function setStateTwoAction(
  payload: number
): AppThunkAction<Promise<void>> {
  return async dispatch => {
    dispatch({ type: 'TASK/SET_STATE_2', payload })
  }
}
`
    )
  })

  test('should be able to add new custom thunk', async () => {
    await run(
      ['s', 't'],
      [
        // Name of thunk
        'setCustomState',
        ENTER,

        // file name
        'custom',
        ENTER,

        // Do you want to generate thunk from reducer?
        'n', // Y

        // Should return promise?
        'n',

        // Specify the return type
        'string',
        ENTER,

        // Specify function parameter(s)
        'foo',
        TAB,
        'string',
        ENTER,

        // more parameter
        'bar',
        TAB,
        'number',
        TAB,
        '0',
        ENTER,

        // stop adding parameters
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
    expect(exists('custom.ts')).toBeTruthy()

    const thunkFile = project.addExistingSourceFile('custom.ts')
    expect(thunkFile.getText()).toEqual(
      `import { AppThunkAction } from '..'

export function setCustomStateAction(
  foo: string,
  bar: number = 0
): AppThunkAction<string> {
  return dispatch => {
    throw new Error('not implemented')
  }
}
`
    )
  })

  test('should be able to add new custom async thunk', async () => {
    await run(
      ['s', 't'],
      [
        // Name of thunk
        'setCustomState',
        ENTER,

        // file name
        'custom',
        ENTER,

        // Do you want to generate thunk from reducer?
        'n', // Y

        // Should return promise?
        'y',

        // Specify the return type
        'string',
        ENTER,

        // Specify function parameter(s)
        'foo',
        TAB,
        'string',
        ENTER,

        // more parameter
        'bar',
        TAB,
        'number',
        TAB,
        '0',
        ENTER,

        // stop adding parameters
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
    expect(exists('custom.ts')).toBeTruthy()

    const thunkFile = project.addExistingSourceFile('custom.ts')
    expect(thunkFile.getText()).toEqual(
      `import { AppThunkAction } from '..'

export function setCustomStateAction(
  foo: string,
  bar: number = 0
): AppThunkAction<Promise<string>> {
  return async dispatch => {
    throw new Error('not implemented')
  }
}
`
    )
  })
})
