/**
 * Get project configuration
 */
export function settings() {
  return {
    folders: {
      source: 'src',
      views: 'views',
      components: 'components',
      screens: 'screens',
      assets: 'assets',
      store: 'store',
      reducers: 'reducers',
      thunks: 'actions',
      navigators: 'navigators',
      styles: 'styles'
    },
    naming: {
      screen: {
        prefix: '',
        suffix: 'Screen'
      },
      component: {
        prefix: '',
        suffix: ''
      },
      thunk: {
        prefix: '',
        suffix: 'Action'
      },
      navigator: {
        prefix: '',
        suffix: 'Nav'
      },
      theme: {
        prefix: '',
        suffix: 'Theme'
      }
    }
  }
}
