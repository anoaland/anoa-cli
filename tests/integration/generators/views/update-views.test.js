const tempy = require('tempy')
const { run, DOWN, ENTER, SPACE, TAB } = require('../../../runner')
const path = require('path')
const fs = require('fs-extra')
const { filesystem } = require('gluegun')
const { Project } = require('ts-morph')

jest.setTimeout(10 * 60 * 1000)

describe('update views tests', () => {
  const FIXTURE = path.join(
    process.cwd(),
    'tests',
    'integration',
    'generators',
    'fixtures',
    'has-component-project'
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

  test('should be able to add props to class based component', async () => {
    await run(
      ['v', 'p'],
      [
        // Select a view kind
        ENTER,

        // Select a Component
        ENTER,

        // Add new props
        'props1',
        TAB,
        'string',
        ENTER,

        // Add more props
        'props2',
        TAB,
        'number',
        ENTER,

        // Stop add props
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
import { ComponentAProps } from './props'

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
      `export interface ComponentAProps {
  props1: string
  props2: number
}
`
    )
  })

  test('should be able to add props to function-view component', async () => {
    await run(
      ['v', 'p'],
      [
        // Select a view kind
        ENTER,

        // Select a Component
        DOWN,
        ENTER,

        // Add new props
        'props1',
        TAB,
        'string',
        ENTER,

        // Add more props
        'props2',
        TAB,
        'number',
        ENTER,

        // Stop add props
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
import { ComponentBProps } from './props'

export function ComponentB(props: ComponentBProps) {
  return (
    <View>
      <Text>ComponentB</Text>
    </View>
  )
}
`
    )

    const propsFile = project.addExistingSourceFile('props.ts')
    expect(propsFile.getText()).toEqual(
      `export interface ComponentBProps {
  props1: string
  props2: number
}
`
    )
  })

  test('should be able to add props to function-view functional component', async () => {
    await run(
      ['v', 'p'],
      [
        // Select a view kind
        ENTER,

        // Select a Component
        DOWN,
        DOWN,
        ENTER,

        // Add new props
        'props1',
        TAB,
        'string',
        ENTER,

        // Add more props
        'props2',
        TAB,
        'number',
        ENTER,

        // Stop add props
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
import { ComponentCProps } from './props'

export const ComponentC: React.SFC<ComponentCProps> = (
  props: ComponentCProps
) => {
  return (
    <View>
      <Text>ComponentC</Text>
    </View>
  )
}
`
    )

    const propsFile = project.addExistingSourceFile('props.ts')
    expect(propsFile.getText()).toEqual(
      `export interface ComponentCProps {
  props1: string
  props2: number
}
`
    )
  })

  test('should be able to add state to class based component', async () => {
    await run(
      ['v', 'e'],
      [
        // Select a view kind
        ENTER,

        // Select a Component
        ENTER,

        // Add new state
        'state1',
        TAB,
        'string',
        TAB,
        `''`,
        ENTER,

        // Add more state
        'state2',
        TAB,
        'number',
        TAB,
        '0',
        ENTER,

        // Stop adding state
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
    expect(exists('state.ts')).toBeTruthy()

    const mainViewFile = project.addExistingSourceFile('index.tsx')
    expect(mainViewFile.getText()).toEqual(
      `import React from 'react'
import { Text, View } from 'react-native'
import { ComponentAState } from './state'

export class ComponentA extends React.Component<any, ComponentAState> {
  constructor(props: any) {
    super(props)
    this.state = { state1: '', state2: 0 }
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

    const stateFile = project.addExistingSourceFile('state.ts')
    expect(stateFile.getText()).toEqual(
      `export interface ComponentAState {
  state1: string
  state2: number
}
`
    )
  })
})
