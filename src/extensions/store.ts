import { uniq } from 'ramda'
import { fromPath } from 'ts-emitter'
import { SyntaxKind } from 'typescript'

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

  context.storeCreateAction = async (name: string, type: string) => {
    const {
      strings: { kebabCase, camelCase, isBlank },
      generateFiles,
      storeInit,
      print,
    } = context

    if (isBlank(name)) {
      print.error('Action name is required')
      process.exit(0)
    }

    if (isBlank(type)) {
      print.error('Action type is required')
      process.exit(0)
    }

    await storeInit()

    const props = {
      name,
      type,
      camelCase,
    }

    await generateFiles(
      'shared/src/store/actions/',
      ['action.ts'],
      `src/store/actions/`,
      props,
      `${kebabCase(name)}-action.ts`,
    )
  }

  context.storeCreateReducer = async (name: string, states: string[]) => {
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

  context.storeUpdateReducers = async () => {
    const { generateFiles, storeReducerList } = context

    const reducers = await storeReducerList()
    await generateFiles('shared/src/store/reducers/', ['index.ts'], `src/store/reducers/`, {
      reducers,
    })
  }

  context.storeReducerObjectList = async () => {
    const {
      filesystem: { inspectTree },
    } = context

    const tree = await inspectTree('src/store/reducers')
    if (!tree || !tree.children || !tree.children.length) {
      return []
    }

    return tree.children.filter(r => r.type === 'dir')
  }

  context.storeReducerList = async () => {
    const {
      strings: { camelCase, pascalCase, kebabCase },
      storeReducerObjectList,
    } = context
    return (await storeReducerObjectList()).map(r => ({
      name: camelCase(r.name),
      val: pascalCase(r.name),
      dir: kebabCase(r.name),
    }))
  }

  context.storeActionList = async () => {
    const { storeReducerObjectList } = context

    // collect reducer's action files
    const actionFiles = (await storeReducerObjectList())
      .filter(r => r.children && r.children.length)
      .map(r => {
        if (r.children.find(c => c.name === 'actions.ts')) {
          return `src/store/reducers/${r.name}/actions.ts`
        }
        return undefined
      })
      .filter(s => s !== undefined)

    if (!actionFiles) {
      return undefined
    }

    let results = {}

    for (const f of actionFiles) {
      const ast = fromPath(f)

      let actionName = ''
      let actionTypes = []

      ast.forEachChild(c => {
        // get action name from 'export default' statement
        if (c.kind === SyntaxKind.ExportAssignment && c.getChildAt(1).getText() === 'default') {
          actionName = c.getChildAt(2).getText()
        }

        // query the action types
        if (c.kind === SyntaxKind.TypeAliasDeclaration) {
          if (c.getChildCount() >= 5) {
            const ch = c.getChildAt(4).getChildAt(0)
            if (ch) {
              for (let i = 0; i < ch.getChildCount(); i++) {
                const obj = ch.getChildAt(i)
                if (obj && obj.kind === SyntaxKind.TypeLiteral) {
                  let actType = {}
                  obj.forEachChild(o => {
                    if (o.kind === SyntaxKind.PropertySignature) {
                      const key = o.getText() as string
                      const val = o.getChildAt(2).getText()
                      if (key.startsWith('type')) {
                        actType[o.getChildAt(0).getText()] = val.slice(1, val.length - 1)
                      } else if (key.startsWith('payload')) {
                        actType[o.getChildAt(0).getText()] = val
                      }
                    }
                  })

                  actionTypes.push(actType)
                }
              }
            }
          }
        }
      })

      results[actionName] = actionTypes
    }

    return results
  }
}
