import { uniq } from 'ramda'

module.exports = context => {
  context.storeInit = async () => {
    const {
      init,
      npmEnsure,
      generateFiles,
      filesystem: { exists },
    } = context

    await init()
    await npmEnsure(false, ['anoa', 'react-redux', 'redux', 'redux-thunk'])
    await npmEnsure(true, ['@types/react-redux'])

    if (!(await exists('src/store/index.ts'))) {
      await generateFiles('shared/src/store/', ['index.ts'], 'src/store/')
    }
  }

  context.storeCreateReducer = async (name: string, states: string[]) => {
    const {
      strings: { pascalCase, kebabCase, snakeCase, camelCase, isBlank },
      generateFiles,
      storeUpdateReducers,
      storeInit,
      print,
    } = context

    await storeInit()

    states = uniq(states.filter(s => !isBlank(s)).map(camelCase))
    if (!states) {
      print.error('Reducer state is required')
      process.exit(0)
    }

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

  context.storeUpdateReducers = async () => {
    const { generateFiles, storeReducerList } = context

    const reducers = await storeReducerList()
    await generateFiles('shared/src/store/reducers/', ['index.ts'], `src/store/reducers/`, {
      reducers,
    })
  }

  context.storeReducerList = async () => {
    const {
      strings: { camelCase, pascalCase, kebabCase },
      filesystem: { inspectTree },
    } = context

    const tree = await inspectTree('src/store/reducers')
    if (!tree || !tree.children || !tree.children.length) {
      return []
    }

    return tree.children
      .filter(r => r.type === 'dir')
      .map(r => ({ name: camelCase(r.name), val: pascalCase(r.name), dir: kebabCase(r.name) }))
  }
}
