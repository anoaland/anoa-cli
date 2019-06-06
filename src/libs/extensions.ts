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
      components: 'views/components',
      screens: 'views/screens',
      assets: 'assets',
      store: 'store',
      reducers: 'store/reducers',
      thunks: 'store/actions'
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
      return path.join(folders.source, folders.components, pathOrFilename)
    },
    screens: (pathOrFilename: string = '') => {
      return path.join(folders.source, folders.screens, pathOrFilename)
    },
    assets: (pathOrFilename: string = '') => {
      return path.join(folders.assets, pathOrFilename)
    },
    reducers: (pathOrFilename: string = '') => {
      return path.join(folders.source, folders.reducers, pathOrFilename)
    },
    store: (pathOrFilename: string = '') => {
      return path.join(folders.source, folders.store, pathOrFilename)
    },
    thunks: (pathOrFilename: string = '') => {
      return path.join(folders.source, folders.thunks, pathOrFilename)
    }
  }
}

export function naming({
  config: {
    naming: { screen, component, thunk }
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
    }
  }
}
