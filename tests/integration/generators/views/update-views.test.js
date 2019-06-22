const tempy = require('tempy')
const { run, DOWN, ENTER, SPACE, TAB } = require('../../../runner')
const path = require('path')
const fs = require('fs-extra')
const { filesystem } = require('gluegun')

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

    process.chdir('src/views/components/component-a')

    expect('index.tsx').existsAndPrettySame(`
    import React from 'react'
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
    `)

    expect('props.ts').existsAndPrettySame(`
    export interface ComponentAProps {
      props1: string
      props2: number
    }
    `)
  })

  test('should be able to add props to function component', async () => {
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

    process.chdir('src/views/components/component-b')

    expect('index.tsx').existsAndPrettySame(`
    import React from 'react'
    import { Text, View } from 'react-native'
    import { ComponentBProps } from './props'
    
    export function ComponentB(props: ComponentBProps) {
      return (
        <View>
          <Text>ComponentB</Text>
        </View>
      )
    }    
    `)

    expect('props.ts').existsAndPrettySame(`
    export interface ComponentBProps {
      props1: string
      props2: number
    }
    `)
  })

  test('should be able to add props to arrow function component', async () => {
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

    process.chdir('src/views/components/component-c')

    expect('index.tsx').existsAndPrettySame(`
    import React from 'react'
    import { Text, View } from 'react-native'
    import { ComponentCProps } from './props'
    
    export const ComponentC: React.FC<ComponentCProps> = (
      props: ComponentCProps
    ) => {
      return (
        <View>
          <Text>ComponentC</Text>
        </View>
      )
    }    
    `)

    expect('props.ts').existsAndPrettySame(`
    export interface ComponentCProps {
      props1: string
      props2: number
    }
    `)
  })

  test('should be able to add state to class based component', async () => {
    await run(
      ['v', 't'],
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

    process.chdir('src/views/components/component-a')

    expect('index.tsx').existsAndPrettySame(`
    import React from 'react'
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
    `)

    expect('state.ts').existsAndPrettySame(`
    export interface ComponentAState {
      state1: string
      state2: number
    }
    `)
  })

  test('should be able to add hooks to function component', async () => {
    await run(
      ['v', 't'],
      [
        // Select a view kind
        ENTER,

        // Select a Component
        DOWN,
        ENTER,

        // Add new state
        'state1',
        TAB,
        `''`,
        ENTER,

        // Add more state
        'state2',
        TAB,
        '0',
        ENTER,

        // Stop adding state
        ENTER
      ]
    )

    process.chdir('src/views/components/component-b')

    expect('index.tsx').existsAndPrettySame(`
    import React, { useState } from 'react'
    import { Text, View } from 'react-native'
    
    export function ComponentB() {
      const [state1, setState1] = useState('')
      const [state2, setState2] = useState(0)
    
      return (
        <View>
          <Text>ComponentB</Text>
        </View>
      )
    }    
    `)
  })

  test('should be able to add hooks to arrow function component', async () => {
    await run(
      ['v', 't'],
      [
        // Select a view kind
        ENTER,

        // Select a Component
        DOWN,
        DOWN,
        ENTER,

        // Add new state
        'state1',
        TAB,
        `''`,
        ENTER,

        // Add more state
        'state2',
        TAB,
        '0',
        ENTER,

        // Stop adding state
        ENTER
      ]
    )

    process.chdir('src/views/components/component-c')

    expect('index.tsx').existsAndPrettySame(`
    import React, { useState } from 'react'
    import { Text, View } from 'react-native'
    
    export const ComponentC: React.FC = () => {
      const [state1, setState1] = useState('')
      const [state2, setState2] = useState(0)
    
      return (
        <View>
          <Text>ComponentC</Text>
        </View>
      )
    }
    `)
  })
})
