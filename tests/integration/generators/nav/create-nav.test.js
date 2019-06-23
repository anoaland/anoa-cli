const tempy = require('tempy')
const { run, DOWN, ENTER, SPACE } = require('../../../runner')
const path = require('path')
const fs = require('fs-extra')

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

  test('should be able to create nav', async () => {
    await run(
      ['n'],
      [
        // Attach this navigator to particular screen?
        'N',

        // Enter navigator name
        'Main Navigator', // arrow function view screen
        ENTER,

        // Select the type of navigator you would like to use
        DOWN,
        DOWN,
        ENTER, // Drawer Navigator

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
        ENTER // ArrowFunctionViewScreen
      ]
    )

    process.chdir('src/views/navigators')

    expect('main-navigator-nav.ts').existsAndPrettySame(
      `
      import { createAppContainer, createDrawerNavigator } from 'react-navigation'
      import { ArrowFunctionViewScreen } from '../screens/arrow-function-view'
      import { ClassViewScreen } from '../screens/class-view'
      import { FunctionViewScreen } from '../screens/function-view'

      export const MainNavigatorNav = createAppContainer(
        createDrawerNavigator(
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
            initialRouteName: 'ArrowFunctionView'
          }
        )
      )
      `
    )
  })

  test('should be able to create nav attached to class based screen', async () => {
    await run(
      ['n'],
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

    process.chdir('src/views/screens/class-view')

    expect('index.tsx').existsAndPrettySame(
      `
      import React from 'react'
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
        `
    )

    expect('nav.ts').existsAndPrettySame(
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
      `
    )
  })

  test('should be able to create nav attached to function screen', async () => {
    await run(
      ['n'],
      [
        // Attach this navigator to particular screen?
        'y',

        // Select screens
        DOWN,
        DOWN,
        ENTER, // function view screen

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
        DOWN,
        ENTER // FunctionViewScreen
      ]
    )

    process.chdir('src/views/screens/function-view')

    expect('index.tsx').existsAndPrettySame(
      `
      import React from 'react'
      import { FunctionViewScreenNav } from './nav'

      export function FunctionViewScreen() {
        return <FunctionViewScreenNav />
        /*
        return (
    <View>
      <Text>FunctionViewScreen</Text>
    </View>
    )
        */
      }`
    )

    expect('nav.ts').existsAndPrettySame(
      `import { createAppContainer, createStackNavigator } from 'react-navigation'
      import { FunctionViewScreen } from '.'
      import { ArrowFunctionViewScreen } from '../arrow-function-view'
      import { ClassViewScreen } from '../class-view'

      export const FunctionViewScreenNav = createAppContainer(
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
            initialRouteName: 'FunctionView'
          }
        )
      )
      `
    )
  })

  test('should be able to create nav attached to arrow function screen', async () => {
    await run(
      ['n'],
      [
        // Attach this navigator to particular screen?
        'y',

        // Select screens
        ENTER, // arrow function view screen

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
        ENTER // ArrowFunctionViewScreen
      ]
    )

    process.chdir('src/views/screens/arrow-function-view')

    expect('index.tsx').existsAndPrettySame(
      `
      import React from 'react'
      import { ArrowFunctionViewScreenNav } from './nav'

      export const ArrowFunctionViewScreen: React.SFC = () => {
        return <ArrowFunctionViewScreenNav />
        /*
        return (
    <View>
      <Text>ArrowFunctionViewScreen</Text>
    </View>
    )
        */
      }
  `
    )

    expect('nav.ts').existsAndPrettySame(
      `import { createAppContainer, createStackNavigator } from 'react-navigation'
      import { ArrowFunctionViewScreen } from '.'
      import { ClassViewScreen } from '../class-view'
      import { FunctionViewScreen } from '../function-view'

      export const ArrowFunctionViewScreenNav = createAppContainer(
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
            initialRouteName: 'ArrowFunctionView'
          }
        )
      )
      `
    )
  })
})
