const tempy = require('tempy')
const { run, DOWN, ENTER, SPACE } = require('../../../runner')
const path = require('path')
const fs = require('fs-extra')

jest.setTimeout(10 * 60 * 1000)

describe('connect theme tests', () => {
  const FIXTURE = path.join(
    process.cwd(),
    'tests',
    'integration',
    'generators',
    'fixtures',
    'has-themes'
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

  test('should be able to connect theme to screens', async () => {
    await run(
      ['t', 'c'],
      [
        // Select a view kind
        DOWN,
        ENTER,

        // Select screen(s) to connect
        SPACE,
        DOWN,
        SPACE,
        DOWN,
        SPACE,
        ENTER
      ]
    )

    process.chdir('src/views/screens')

    expect('class-view/index.tsx').existsAndPrettySame(
      `import React from 'react'
      import { Text, View } from 'react-native'
      import { AppStyle } from '../../styles'
      import { ClassViewScreenProps } from './props'
      
      @AppStyle.withThemeClass()
      export class ClassViewScreen extends React.Component<ClassViewScreenProps> {
        constructor(props: ClassViewScreenProps) {
          super(props)
        }
      
        render() {
          return (
            <View>
              <Text>ClassViewScreen</Text>
            </View>
          )
        }
      }
      `
    )

    expect('class-view/props.ts').existsAndPrettySame(
      `import { AppStyleProps } from '../../styles'

      export interface ClassViewScreenProps extends AppStyleProps {}
      `
    )

    expect('function-view/index.tsx').existsAndPrettySame(
      `import React from 'react'
      import { Text, View } from 'react-native'
      import { AppStyle } from '../../styles'
      import { FunctionViewScreenProps } from './props'
      
      function _FunctionViewScreen(props: FunctionViewScreenProps) {
        return (
          <View>
            <Text>FunctionViewScreen</Text>
          </View>
        )
      }
      
      export const FunctionViewScreen = AppStyle.withTheme(_FunctionViewScreen)
      `
    )

    expect('function-view/props.ts').existsAndPrettySame(
      `import { AppStyleProps } from '../../styles'

      export interface FunctionViewScreenProps extends AppStyleProps {}
      `
    )

    expect('arrow-function-view/index.tsx').existsAndPrettySame(
      `import React from 'react'
      import { Text, View } from 'react-native'
      import { AppStyle } from '../../styles'
      import { ArrowFunctionViewScreenProps } from './props'
      
      export const ArrowFunctionViewScreen = AppStyle.withTheme(
        (props: ArrowFunctionViewScreenProps) => {
          return (
            <View>
              <Text>ArrowFunctionViewScreen</Text>
            </View>
          )
        }
      )
      `
    )

    expect('arrow-function-view/props.ts').existsAndPrettySame(
      `import { AppStyleProps } from '../../styles'

      export interface ArrowFunctionViewScreenProps extends AppStyleProps {}
      `
    )
  })
})
