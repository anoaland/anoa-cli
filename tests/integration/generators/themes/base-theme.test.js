const tempy = require('tempy')
const { run, ENTER } = require('../../../runner')
const path = require('path')
const fs = require('fs-extra')

jest.setTimeout(10 * 60 * 1000)

describe('base theme tests', () => {
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

  test('should be able to create base theme', async () => {
    await run(
      ['t', 'n'],
      [
        // install anoa-react-native-theme package and generate base theme
        ENTER
      ]
    )

    expect('src/views/styles/themes/base.ts').existsAndPrettySame(
      `import { createTheme } from 'anoa-react-native-theme'

      export const BaseTheme = createTheme(
        {
          // define theme variables
        },
        vars => ({
          // define theme styles
        })
      )
      `
    )

    expect('src/views/styles/index.ts').existsAndPrettySame(
      `
      // --------------------------------------------------------- //
      // Please do not edit this file. This file is autogenerated. //
      // --------------------------------------------------------- //
      
      import { ThemeContext, ThemeContextProps } from 'anoa-react-native-theme'
      import { BaseTheme } from './themes/base'
      
      const themes = {
        // child themes goes here
      }
      
      export const AppStyle = new ThemeContext(BaseTheme, themes)
      export type AppThemes = typeof themes
      export type AppStyleProps = ThemeContextProps<typeof BaseTheme, AppThemes>      
      `
    )

    expect('src/App.tsx').existsAndPrettySame(
      `
      import React, { Component } from 'react'
      import { Text, View } from 'react-native'
      import { MainScreen } from './views/screens/main'
      import { AppStyle } from './views/styles'

      interface State {
        ready: boolean
        error?: string
      }

      /**
       * Application root component.
       */
      export default class App extends Component<any, State> {
        constructor(props: any) {
          super(props)
          this.state = {
            ready: false
          }

          this.prepare = this.prepare.bind(this)
        }

        async componentDidMount() {
          try {
            await this.prepare()
            this.setState({ ready: true })
          } catch (error) {
            this.setState({ ready: true, error })
          }
        }

        render() {
          const { ready, error } = this.state

          if (!ready) {
            return null
          }

          if (error) {
            return this.renderError(error)
          }

          return this.renderMain()
        }

        /**
         * Render main view of application.
         * Do not rename this function -- anoa will look this function
         * to wrap your main view with neccessary provider as if needed.
         */
        renderMain() {
          return (
            <AppStyle.Provider>
              <MainScreen />
            </AppStyle.Provider>
          )
        }

        /**
         * Show this view when preparation were failed.
         * @param error error message
         */
        renderError(error: string) {
          // TODO: do nicer error handler
          return (
            <View
              style={{
                flex: 1,
                alignContent: 'center',
                alignItems: 'center',
                backgroundColor: 'red',
                padding: 60
              }}
            >
              <Text>Oops!</Text>
              <Text style={{ color: 'white' }}>{error}</Text>
            </View>
          )
        }

        /**
         * Prepare application before showing main view.
         * Do not rename this function -- anoa will look this function
         * to add necessary calls as if needed.
         */
        async prepare(): Promise<void> {
          // TODO: Load anything before main screen shown
        }
      }
      `
    )
  })
})
