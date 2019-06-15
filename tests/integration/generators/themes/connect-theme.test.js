const tempy = require('tempy')
const { run, DOWN, ENTER, SPACE, TAB } = require('../../../runner')
const path = require('path')
const fs = require('fs-extra')
const { filesystem } = require('gluegun')
const { Project } = require('ts-morph')

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

    const { exists, cwd } = filesystem
    const tsConfigFilePath = path.join(cwd(), 'tsconfig.json')
    expect(exists(tsConfigFilePath)).toBeTruthy()

    const project = new Project({
      tsConfigFilePath
    })

    process.chdir('src/views/screens')

    const classBasedScreenFile = project.addExistingSourceFile(
      'class-view/index.tsx'
    )
    expect(classBasedScreenFile.getText().replace(/\s+/gm, ` `)).toEqual(
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
      `.replace(/\s+/gm, ` `)
    )

    const classBasedScreenPropsFile = project.addExistingSourceFile(
      'class-view/props.ts'
    )
    expect(classBasedScreenPropsFile.getText().replace(/\s+/gm, ` `)).toEqual(
      `import { AppStyleProps } from '../../styles'

      export interface ClassViewScreenProps extends AppStyleProps {}
      `.replace(/\s+/gm, ` `)
    )

    const functionViewScreenFile = project.addExistingSourceFile(
      'function-view/index.tsx'
    )
    expect(functionViewScreenFile.getText().replace(/\s+/gm, ` `)).toEqual(
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
      `.replace(/\s+/gm, ` `)
    )

    const functionViewScreenPropsFile = project.addExistingSourceFile(
      'function-view/props.ts'
    )
    expect(functionViewScreenPropsFile.getText().replace(/\s+/gm, ` `)).toEqual(
      `import { AppStyleProps } from '../../styles'

      export interface FunctionViewScreenProps extends AppStyleProps {}
      `.replace(/\s+/gm, ` `)
    )

    const arrowFunctionScreenFile = project.addExistingSourceFile(
      'arrow-function-view/index.tsx'
    )
    expect(arrowFunctionScreenFile.getText().replace(/\s+/gm, ` `)).toEqual(
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
      `.replace(/\s+/gm, ` `)
    )

    const arrowFunctionViewScreenPropsFile = project.addExistingSourceFile(
      'arrow-function-view/props.ts'
    )
    expect(
      arrowFunctionViewScreenPropsFile.getText().replace(/\s+/gm, ` `)
    ).toEqual(
      `import { AppStyleProps } from '../../styles'

      export interface ArrowFunctionViewScreenProps extends AppStyleProps {}
      `.replace(/\s+/gm, ` `)
    )
  })
})
