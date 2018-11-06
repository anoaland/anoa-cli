import { uniq } from 'ramda'
import { RootContext } from '..'

export function storeCreateReducer(context: RootContext) {
  return async (name: string, states: string[]) => {
    const {
      strings: { pascalCase, kebabCase, snakeCase, camelCase, isBlank },
      generateFiles,
      storeUpdateReducers,
      storeInit,
      print,
    } = context

    if (isBlank(name)) {
      print.error('Reducer name is required')
      process.exit(0)
    }

    states = uniq(states.filter(s => !isBlank(s)).map(camelCase))
    if (!states) {
      print.error('Reducer state is required')
      process.exit(0)
    }

    await storeInit()

    const props = {
      name: pascalCase(name),
      states,
      upperCase: s => {
        return snakeCase(s).toUpperCase()
      },
      camelCase,
    }

    await generateFiles(
      'shared/src/store/reducers/reducer/',
      ['state.ts', 'actions.ts', 'index.ts'],
      `src/store/reducers/${kebabCase(name)}/`,
      props,
    )

    await storeUpdateReducers()
  }
}
