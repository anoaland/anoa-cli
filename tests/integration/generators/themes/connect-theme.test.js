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
      'class-based/index.tsx'
    )
    expect(classBasedScreenFile.getText().replace(/\s+/gm, ` `)).toEqual(
      `import React from 'react'
      import { Text, View } from 'react-native'
      import { AppStyle } from '../../styles'
      import { ClassBasedScreenProps } from './props'
      
      @AppStyle.withThemeClass()
      export class ClassBasedScreen extends React.Component<ClassBasedScreenProps> {
        constructor(props: ClassBasedScreenProps) {
          super(props)
        }
      
        render() {
          return (
            <View>
              <Text>ClassBasedScreen</Text>
            </View>
          )
        }
      }
      `.replace(/\s+/gm, ` `)
    )

    const classBasedScreenPropsFile = project.addExistingSourceFile(
      'class-based/props.ts'
    )
    expect(classBasedScreenPropsFile.getText().replace(/\s+/gm, ` `)).toEqual(
      `import { AppStyleProps } from '../../styles'

      export interface ClassBasedScreenProps extends AppStyleProps {}
      `.replace(/\s+/gm, ` `)
    )

    const statelessScreenFile = project.addExistingSourceFile(
      'stateless/index.tsx'
    )
    expect(statelessScreenFile.getText().replace(/\s+/gm, ` `)).toEqual(
      `import React from 'react'
      import { Text, View } from 'react-native'
      import { AppStyle } from '../../styles'
      import { StatelessScreenProps } from './props'
      
      function _StatelessScreen(props: StatelessScreenProps) {
        return (
          <View>
            <Text>StatelessScreen</Text>
          </View>
        )
      }
      
      export const StatelessScreen = AppStyle.withTheme(_StatelessScreen)
      `.replace(/\s+/gm, ` `)
    )

    const statelessScreenPropsFile = project.addExistingSourceFile(
      'stateless/props.ts'
    )
    expect(statelessScreenPropsFile.getText().replace(/\s+/gm, ` `)).toEqual(
      `import { AppStyleProps } from '../../styles'

      export interface StatelessScreenProps extends AppStyleProps {}
      `.replace(/\s+/gm, ` `)
    )

    const statelessFnScreenFile = project.addExistingSourceFile(
      'stateless-fn/index.tsx'
    )
    expect(statelessFnScreenFile.getText().replace(/\s+/gm, ` `)).toEqual(
      `import React from 'react'
      import { Text, View } from 'react-native'
      import { AppStyle } from '../../styles'
      import { StatelessFnScreenProps } from './props'
      
      export const StatelessFnScreen = AppStyle.withTheme(
        (props: StatelessFnScreenProps) => {
          return (
            <View>
              <Text>StatelessFnScreen</Text>
            </View>
          )
        }
      )
      `.replace(/\s+/gm, ` `)
    )

    const statelessFnScreenPropsFile = project.addExistingSourceFile(
      'stateless-fn/props.ts'
    )
    expect(statelessFnScreenPropsFile.getText().replace(/\s+/gm, ` `)).toEqual(
      `import { AppStyleProps } from '../../styles'

      export interface StatelessFnScreenProps extends AppStyleProps {}
      `.replace(/\s+/gm, ` `)
    )
  })
})
