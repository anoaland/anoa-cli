import { RootContext } from '../context'

export function naming(context: RootContext) {
  return {
    screen: (name: string) => {
      const {
        settings: {
          naming: { screen }
        },
        strings: { pascalCase, trim }
      } = context
      return (
        pascalCase(trim(screen.prefix)) +
        pascalCase(trim(name)) +
        pascalCase(trim(screen.suffix))
      )
    },
    component: (name: string) => {
      const {
        settings: {
          naming: { component }
        },
        strings: { pascalCase, trim }
      } = context
      return (
        pascalCase(trim(component.prefix)) +
        pascalCase(trim(name)) +
        pascalCase(trim(component.suffix))
      )
    },
    state: (name: string) => {
      const {
        settings: {},
        strings: { pascalCase, trim }
      } = context
      return pascalCase(trim(name)) + 'State'
    },
    props: (name: string) => {
      const {
        settings: {},
        strings: { pascalCase, trim }
      } = context
      return pascalCase(trim(name)) + 'Props'
    },
    stateProps: (name: string) => {
      const {
        settings: {},
        strings: { pascalCase, trim }
      } = context
      return pascalCase(trim(name)) + 'StateProps'
    },
    actionProps: (name: string) => {
      const {
        settings: {},
        strings: { pascalCase, trim }
      } = context
      return pascalCase(trim(name)) + 'ActionProps'
    },
    store: (name: string = '') => {
      const {
        settings: {},
        strings: { pascalCase, trim, upperCase, snakeCase }
      } = context
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
      const {
        settings: {
          naming: { thunk }
        },
        strings: { trim, camelCase }
      } = context
      return thunk.prefix + camelCase(trim(name)) + thunk.suffix
    },
    navigator: (name: string) => {
      const {
        settings: {
          naming: { navigator }
        },
        strings: { pascalCase, trim }
      } = context
      if (
        name
          .trim()
          .toLowerCase()
          .endsWith(navigator.suffix.toLowerCase())
      ) {
        name = name.substr(0, name.length - navigator.suffix.length)
      }
      return navigator.prefix + pascalCase(trim(name)) + navigator.suffix
    },
    theme: (name: string) => {
      const {
        settings: {
          naming: { theme }
        },
        strings: { pascalCase, trim }
      } = context
      return theme.prefix + pascalCase(trim(name)) + theme.suffix
    }
  }
}
