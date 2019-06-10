import * as path from 'path'
import { RootContext } from '.'

/**
 * Get project configuration
 * @param _context root context
 */
export function config(_context: RootContext) {
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
      navigators: 'navigators'
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
      }
    }
  }
}

/**
 * Get folder path
 * @param param0 root context
 */
export function folder({ config: { folders } }: RootContext) {
  return {
    src: (pathOrFilename: string = '') => {
      return path.join(folders.source, pathOrFilename)
    },
    components: (pathOrFilename: string = '') => {
      return path.join(
        folders.source,
        folders.views,
        folders.components,
        pathOrFilename
      )
    },
    screens: (pathOrFilename: string = '') => {
      return path.join(
        folders.source,
        folders.views,
        folders.screens,
        pathOrFilename
      )
    },
    navigator: (pathOrFilename: string = '') => {
      return path.join(
        folders.source,
        folders.views,
        folders.navigators,
        pathOrFilename
      )
    },
    assets: (pathOrFilename: string = '') => {
      return path.join(folders.assets, pathOrFilename)
    },
    store: (pathOrFilename: string = '') => {
      return path.join(folders.source, folders.store, pathOrFilename)
    },
    reducers: (pathOrFilename: string = '') => {
      return path.join(
        folders.source,
        folders.store,
        folders.reducers,
        pathOrFilename
      )
    },
    thunks: (pathOrFilename: string = '') => {
      return path.join(
        folders.source,
        folders.store,
        folders.thunks,
        pathOrFilename
      )
    }
  }
}

export function naming({
  config: {
    naming: { screen, component, thunk, navigator }
  },
  strings: { pascalCase, trim, upperCase, snakeCase, camelCase }
}: RootContext) {
  return {
    screen: (name: string) => {
      return (
        pascalCase(trim(screen.prefix)) +
        pascalCase(trim(name)) +
        pascalCase(trim(screen.suffix))
      )
    },
    component: (name: string) => {
      return (
        pascalCase(trim(component.prefix)) +
        pascalCase(trim(name)) +
        pascalCase(trim(component.suffix))
      )
    },
    state: (name: string) => {
      return pascalCase(trim(name)) + 'State'
    },
    props: (name: string) => {
      return pascalCase(trim(name)) + 'Props'
    },
    stateProps: (name: string) => {
      return pascalCase(trim(name)) + 'StateProps'
    },
    actionProps: (name: string) => {
      return pascalCase(trim(name)) + 'ActionProps'
    },
    store: (name: string = '') => {
      const baseName = pascalCase(trim(name))
      return {
        rootState() {
          return 'AppRootState'
        },
        rootActions() {
          return 'AppRootActions'
        },
        reducer() {
          return baseName + 'Reducer'
        },
        state() {
          return baseName + 'State'
        },
        action() {
          return baseName + 'Action'
        },
        actionTypeName() {
          return upperCase(snakeCase(name)).replace(/\s/g, '_')
        }
      }
    },
    thunk: (name: string) => {
      return thunk.prefix + camelCase(trim(name)) + thunk.suffix
    },
    navigator: (name: string) => {
      if (
        name
          .trim()
          .toLowerCase()
          .endsWith(navigator.suffix.toLowerCase())
      ) {
        name = name.substr(0, name.length - navigator.suffix.length)
      }
      return navigator.prefix + pascalCase(trim(name)) + navigator.suffix
    }
  }
}
