import React, { Component } from 'react'
import { Text, View } from 'react-native'
import { MainScreen } from './views/screens/main'

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
    return <MainScreen />
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
