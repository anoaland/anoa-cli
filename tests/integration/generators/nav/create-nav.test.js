const tempy = require('tempy')
const { run, DOWN, ENTER, SPACE, TAB } = require('../../../runner')
const path = require('path')
const fs = require('fs-extra')
const { filesystem } = require('gluegun')
const { Project } = require('ts-morph')

jest.setTimeout(10 * 60 * 1000)

describe('create nav tests', () => {
  const FIXTURE = path.join(
    process.cwd(),
    'tests',
    'integration',
    'generators',
    'fixtures',
    'has-screens'
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

  test('should be able to create nav for the first time', async () => {
    await run(
      ['n', 'n'],
      [
        // Attach this navigator to particular screen?
        'y',

        // Select screens
        DOWN,
        ENTER, // class based

        // Select the type of navigator you would like to use
        ENTER, // Stack Navigator

        // Select screens to routes
        SPACE,
        DOWN,
        SPACE,
        DOWN,
        SPACE,
        ENTER,

        // Define route titles
        ENTER,

        // Select the initial route
        DOWN,
        ENTER // ClassViewScreen          [class-view/index.tsx]
      ]
    )

    const { exists, cwd } = filesystem
    const tsConfigFilePath = path.join(cwd(), 'tsconfig.json')
    expect(exists(tsConfigFilePath)).toBeTruthy()

    const project = new Project({
      tsConfigFilePath
    })

    process.chdir('src/views/screens/class-view')

    const screenFile = project.addExistingSourceFile('index.tsx')
    expect(screenFile.getText().replace(/\s+/gm, ` `)).toEqual(
      `import React from 'react'
import { ClassViewScreenNav } from './nav'

export class ClassViewScreen extends React.Component {
  render() {
    return <ClassViewScreenNav />
    /*
          return (
      <View>
      <Text>ClassViewScreen</Text>
      </View>
      )
          */
  }
}
`.replace(/\s+/gm, ` `)
    )

    const navFile = project.addExistingSourceFile('nav.ts')
    expect(navFile.getText().replace(/\s+/gm, ` `)).toEqual(
      `import { createAppContainer, createStackNavigator } from 'react-navigation'
      import { ClassViewScreen } from '.'
      import { ArrowFunctionViewScreen } from '../arrow-function-view'
      import { FunctionViewScreen } from '../function-view'
      
      export const ClassViewScreenNav = createAppContainer(
        createStackNavigator(
          {
            ArrowFunctionView: {
              screen: ArrowFunctionViewScreen,
              navigationOptions: {
                title: 'Arrow Function View'
              }
            },
            ClassView: {
              screen: ClassViewScreen,
              navigationOptions: {
                title: 'Class View'
              }
            },
            FunctionView: {
              screen: FunctionViewScreen,
              navigationOptions: {
                title: 'Function View'
              }
            }
          },
          {
            initialRouteName: 'ClassView'
          }
        )
      )
      `.replace(/\s+/gm, ` `)
    )
  })
})
