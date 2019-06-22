const tempy = require('tempy')
const { run, DOWN, ENTER, TAB } = require('../../../runner')
const path = require('path')
const fs = require('fs-extra')
const { filesystem } = require('gluegun')

jest.setTimeout(10 * 60 * 1000)

describe('create components with props, state and hooks tests', () => {
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

  test('should be able to create a class based component with props and state', async () => {
    await run(
      ['v', 'c', 'foo'],
      [
        // What component type do you prefer? class based
        ENTER,

        // first props
        'props1',
        TAB,
        'string',
        ENTER,

        // second props
        'props2',
        TAB,
        'string',
        ENTER,

        // end props
        ENTER,

        // first state
        'state1',
        TAB,
        'string',
        TAB,
        `''`,
        ENTER,

        // end state
        ENTER
      ],
      1500
    )

    process.chdir('src/views/components/foo')

    expect('index.tsx').existsAndPrettySame(`
    import React from 'react'
    import { Text, View } from 'react-native'
    import { FooProps } from './props'
    import { FooState } from './state'

    export class Foo extends React.Component<FooProps, FooState> {
      constructor(props: FooProps) {
        super(props)
        this.state = { state1: '' }
      }

      render() {
        return (
          <View>
            <Text>Foo</Text>
          </View>
        )
      }
    }
    `)

    expect('props.ts').existsAndPrettySame(`
    export interface FooProps {
      props1: string
      props2: string
    }    
    `)

    expect('state.ts').existsAndPrettySame(`
    export interface FooState {
      state1: string
    }       
    `)
  })

  test('should be able to create a function-view component with props and hooks', async () => {
    await run(
      ['v', 'c', 'foo'],
      [
        // What component type do you prefer? class based
        DOWN,
        ENTER,

        // first props
        'props1',
        TAB,
        'string',
        ENTER,

        // second props
        'props2',
        TAB,
        'string',
        ENTER,

        // end props
        ENTER,

        // first hooks
        'state1',
        TAB,
        `''`,
        ENTER,

        // second hooks
        'state2',
        TAB,
        `0`,
        ENTER,

        // end state
        ENTER
      ],
      1500
    )

    process.chdir('src/views/components/foo')

    expect('index.tsx').existsAndPrettySame(`
    import React, { useState } from 'react'
    import { Text, View } from 'react-native'
    import { FooProps } from './props'

    export function Foo(props: FooProps) {
      const [state1, setState1] = useState('')
      const [state2, setState2] = useState(0)

      return (
        <View>
          <Text>Foo</Text>
        </View>
      )
    }
    `)

    expect('props.ts').existsAndPrettySame(`
    export interface FooProps {
      props1: string
      props2: string
    }    
    `)
  })

  test('should be able to create a arrow-function-view component with props and hooks', async () => {
    await run(
      ['v', 'c', 'foo'],
      [
        // What component type do you prefer? class based
        DOWN,
        DOWN,
        ENTER,

        // first props
        'props1',
        TAB,
        'string',
        ENTER,

        // second props
        'props2',
        TAB,
        'string',
        ENTER,

        // end props
        ENTER,

        // first hooks
        'state1',
        TAB,
        `''`,
        ENTER,

        // second hooks
        'state2',
        TAB,
        `0`,
        ENTER,

        // end state
        ENTER
      ],
      1500
    )

    process.chdir('src/views/components/foo')

    expect('index.tsx').existsAndPrettySame(`
    import React, { useState } from 'react'
    import { Text, View } from 'react-native'
    import { FooProps } from './props'
    
    export const Foo: React.FC<FooProps> = props => {
      const [state1, setState1] = useState('')
      const [state2, setState2] = useState(0)
    
      return (
        <View>
          <Text>Foo</Text>
        </View>
      )
    }    
    `)

    expect('props.ts').existsAndPrettySame(`
    export interface FooProps {
      props1: string
      props2: string
    }    
    `)
  })
})
