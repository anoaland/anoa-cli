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
        ENTER, // class based

        // Select the type of navigator you would like to use
        ENTER, // Stack Navigator

        // Select screens to routes
        SPACE,
        DOWN,
        DOWN,
        SPACE,
        DOWN,
        SPACE,
        ENTER,

        // Define route titles
        ENTER,

        // Select the initial route
        ENTER // ClassBasedScreen          [class-based/index.tsx]
      ]
    )

    const { exists, cwd } = filesystem
    const tsConfigFilePath = path.join(cwd(), 'tsconfig.json')
    expect(exists(tsConfigFilePath)).toBeTruthy()

    const project = new Project({
      tsConfigFilePath
    })

    process.chdir('src/views/screens/class-based')

    const screenFile = project.addExistingSourceFile('index.tsx')
    expect(screenFile.getText()).toEqual(
      `import React from 'react'
import { ClassBasedScreenNav } from './nav'

export class ClassBasedScreen extends React.Component {
  render() {
    return <ClassBasedScreenNav />
    /*
          return (
      <View>
      <Text>ClassBasedScreen</Text>
      </View>
      )
          */
  }
}
`
    )

    const navFile = project.addExistingSourceFile('nav.ts')
    expect(navFile.getText()).toEqual(
      `import { createAppContainer, createStackNavigator } from 'react-navigation'
import { ClassBasedScreen } from '.'
import { StatelessScreen } from '../stateless'
import { StatelessFnScreen } from '../stateless-fn'

export const ClassBasedScreenNav = createAppContainer(
  createStackNavigator(
    {
      ClassBased: {
        screen: ClassBasedScreen,
        navigationOptions: {
          title: 'Class Based'
        }
      },
      Stateless: {
        screen: StatelessScreen,
        navigationOptions: {
          title: 'Stateless'
        }
      },
      StatelessFn: {
        screen: StatelessFnScreen,
        navigationOptions: {
          title: 'Stateless Fn'
        }
      }
    },
    {
      initialRouteName: 'ClassBased'
    }
  )
)
`
    )
  })
})
