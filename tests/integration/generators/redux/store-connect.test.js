const tempy = require('tempy')
const { run, DOWN, ENTER, SPACE } = require('../../../runner')
const path = require('path')
const fs = require('fs-extra')
const { filesystem } = require('gluegun')
const { Project } = require('ts-morph')

jest.setTimeout(10 * 60 * 1000)

describe('store connect tests', () => {
  const FIXTURE = path.join(
    process.cwd(),
    'tests',
    'integration',
    'generators',
    'fixtures',
    'has-store-and-component-project'
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

  test('should be able to connect store to class based component', async () => {
    await run(
      ['s', 'c'],
      [
        // Select states to map
        SPACE,
        ENTER,

        // Select thunks to map
        SPACE,
        ENTER,

        // Select view kind to connect
        ENTER,

        // Select a Component
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

    process.chdir('src/views/components/component-a')

    // files are exists
    expect(exists('index.tsx')).toBeTruthy()
    expect(exists('props.ts')).toBeTruthy()

    const mainViewFile = project.addExistingSourceFile('index.tsx')
    expect(mainViewFile.getText()).toEqual(
      `import React from 'react'
import { Text, View } from 'react-native'
import { AppStore } from '../../../store'
import { setStateTwoAction } from '../../../store/actions/common'
import {
  ComponentAActionProps,
  ComponentAProps,
  ComponentAStateProps
} from './props'

@AppStore.withStoreClass<ComponentAStateProps, ComponentAActionProps>(
  state => ({ taskState1: state.task.state1, taskState2: state.task.state2 }),
  dispatch => ({
    commonSetStateTwo: payload => dispatch(setStateTwoAction(payload))
  })
)
export class ComponentA extends React.Component<ComponentAProps> {
  constructor(props: ComponentAProps) {
    super(props)
  }

  render() {
    return (
      <View>
        <Text>ComponentA</Text>
      </View>
    )
  }
}
`
    )

    const propsFile = project.addExistingSourceFile('props.ts')
    expect(propsFile.getText()).toEqual(
      `export interface ComponentAProps
  extends Partial<ComponentAStateProps>,
    Partial<ComponentAActionProps> {}

export interface ComponentAStateProps {
  taskState1: string
  taskState2: number
}

export interface ComponentAActionProps {
  commonSetStateTwo: (payload: number) => void
}
`
    )
  })

  test('should be able to connect store to function-view component', async () => {
    await run(
      ['s', 'c'],
      [
        // Select states to map
        SPACE,
        ENTER,

        // Select thunks to map
        SPACE,
        ENTER,

        // Select view kind to connect
        ENTER,

        // Select a Component
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

    process.chdir('src/views/components/component-b')

    // files are exists
    expect(exists('index.tsx')).toBeTruthy()
    expect(exists('props.ts')).toBeTruthy()

    const mainViewFile = project.addExistingSourceFile('index.tsx')
    expect(mainViewFile.getText()).toEqual(
      `import React from 'react'
import { Text, View } from 'react-native'
import { AppStore } from '../../../store'
import { setStateTwoAction } from '../../../store/actions/common'
import {
  ComponentBActionProps,
  ComponentBProps,
  ComponentBStateProps
} from './props'

function _ComponentB(props: ComponentBProps) {
  return (
    <View>
      <Text>ComponentB</Text>
    </View>
  )
}

export const ComponentB = AppStore.withStore<
  ComponentBStateProps,
  ComponentBActionProps
>(
  state => ({ taskState1: state.task.state1, taskState2: state.task.state2 }),
  dispatch => ({
    commonSetStateTwo: payload => dispatch(setStateTwoAction(payload))
  })
)(_ComponentB)
`
    )

    const propsFile = project.addExistingSourceFile('props.ts')
    expect(propsFile.getText()).toEqual(
      `export interface ComponentBProps
  extends Partial<ComponentBStateProps>,
    Partial<ComponentBActionProps> {}

export interface ComponentBStateProps {
  taskState1: string
  taskState2: number
}

export interface ComponentBActionProps {
  commonSetStateTwo: (payload: number) => void
}
`
    )
  })

  test('should be able to connect store to function-view functional component', async () => {
    await run(
      ['s', 'c'],
      [
        // Select states to map
        SPACE,
        ENTER,

        // Select thunks to map
        SPACE,
        ENTER,

        // Select view kind to connect
        ENTER,

        // Select a Component
        DOWN,
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

    process.chdir('src/views/components/component-c')

    // files are exists
    expect(exists('index.tsx')).toBeTruthy()
    expect(exists('props.ts')).toBeTruthy()

    const mainViewFile = project.addExistingSourceFile('index.tsx')
    expect(mainViewFile.getText()).toEqual(
      `import React from 'react'
import { Text, View } from 'react-native'
import { AppStore } from '../../../store'
import { setStateTwoAction } from '../../../store/actions/common'
import {
  ComponentCActionProps,
  ComponentCProps,
  ComponentCStateProps
} from './props'

export const ComponentC = AppStore.withStore<
  ComponentCStateProps,
  ComponentCActionProps
>(
  state => ({ taskState1: state.task.state1, taskState2: state.task.state2 }),
  dispatch => ({
    commonSetStateTwo: payload => dispatch(setStateTwoAction(payload))
  })
)((props: ComponentCProps) => {
  return (
    <View>
      <Text>ComponentC</Text>
    </View>
  )
})
`
    )

    const propsFile = project.addExistingSourceFile('props.ts')
    expect(propsFile.getText()).toEqual(
      `export interface ComponentCProps
  extends Partial<ComponentCStateProps>,
    Partial<ComponentCActionProps> {}

export interface ComponentCStateProps {
  taskState1: string
  taskState2: number
}

export interface ComponentCActionProps {
  commonSetStateTwo: (payload: number) => void
}
`
    )
  })
})
