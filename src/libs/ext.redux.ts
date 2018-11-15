import { uniq } from 'ramda'
import { RootContext } from '.'
import { SyntaxKind, UnionTypeNode, TypeLiteralNode } from 'ts-simple-ast'

interface ReducerActionInfo {
  type: string
  payload: string
}

interface ThunkActionInfo {
  file: string
  params: Record<string, string>
}

type NamedReducerActions = Record<string, ReducerActionInfo[]>

type NamedReducerTypes = Record<string, Record<string, string>>

type NamedThunkActions = Record<string, ThunkActionInfo>

class ReduxStore {
  context: RootContext
  constructor(context: RootContext) {
    this.context = context
  }

  /**
   * Create new reducer.
   * @param name Reducer Name
   * @param states List of state, separated with space
   */
  async createReducer(name: string, states: string[]) {
    const {
      strings: { pascalCase, kebabCase, snakeCase, camelCase, isBlank },
      utils,
      print,
    } = this.context

    if (isBlank(name)) {
      print.error('Reducer name is required')
      process.exit(0)
    }

    states = uniq(states.filter(s => !isBlank(s)).map(camelCase))
    if (!states) {
      print.error('Reducer state is required')
      process.exit(0)
    }

    await this.init()

    const props = {
      name: pascalCase(name),
      states,
      upperCase: s => {
        return snakeCase(s).toUpperCase()
      },
      camelCase,
    }

    await utils.generate(
      'shared/src/store/reducers/reducer/',
      `src/store/reducers/${kebabCase(name)}/`,
      ['state.ts', 'actions.ts', 'index.ts'],
      props,
    )

    await this.updateReducers()
  }

  /**
   * Create new action thunk.
   * @param name Action function name
   * @param type Action type
   */
  async createActionThunk(name: string, type: string, payloadType: string) {
    const {
      strings: { kebabCase, camelCase, isBlank },
      utils,
      print,
    } = this.context

    if (isBlank(name)) {
      print.error('Action name is required')
      process.exit(0)
    }

    if (isBlank(type)) {
      print.error('Action type is required')
      process.exit(0)
    }

    await this.init()

    const props = {
      name,
      type,
      camelCase,
      payloadType,
    }

    await utils.generate(
      'shared/src/store/actions/',
      `src/store/actions/`,
      [{ source: 'action.ts', dest: `${kebabCase(name)}-action.ts` }],

      props,
    )
  }

  /**
   * Get all named reducer actions.
   */
  async reducerActions(): Promise<NamedReducerActions> {
    const { utils } = this.context

    const actionFiles = (await this.reducerObjectList())
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

    let results: NamedReducerActions = {}

    const info: ReducerActionInfo[] = []

    const parseProperty = (node: UnionTypeNode | TypeLiteralNode) => {
      // @ts-ignore
      let obj: ReducerActionInfo = {}
      node.getDescendantsOfKind(SyntaxKind.PropertySignature).forEach(c1 => {
        const flds = c1.getText().split(':')
        const key = flds[0].trim()
        const val = flds[1].trim()
        obj[key] = key === 'type' ? val.slice(1, val.length - 1) : val
      })
      info.push(obj)
    }

    actionFiles.forEach(f => {
      const { sourceFile } = utils.ast(f)

      const def = sourceFile.getDefaultExportSymbol()
      const name = def.getFullyQualifiedName().split('.')[1]
      const typeAlias = sourceFile.getTypeAlias(name)
      const actionLiterals = [
        ...typeAlias.getChildrenOfKind(SyntaxKind.UnionType),
        ...typeAlias.getChildrenOfKind(SyntaxKind.TypeLiteral),
      ]

      actionLiterals.forEach(a => {
        if (a.getKind() === SyntaxKind.TypeLiteral) {
          parseProperty(a)
        } else {
          a.getDescendantsOfKind(SyntaxKind.TypeLiteral).forEach(c => {
            parseProperty(c)
          })
        }
      })

      results[name] = info
    })

    return results
  }

  /**
   * Get all named reducer states.
   */
  async reducerStates(): Promise<NamedReducerTypes> {
    const {
      strings: { camelCase },
      utils,
    } = this.context

    const stateFiles = (await this.reducerObjectList())
      .filter(r => r.children && r.children.length)
      .map(r => {
        if (r.children.find(c => c.name === 'state.ts')) {
          return { name: camelCase(r.name), path: `src/store/reducers/${r.name}/state.ts` }
        }
        return undefined
      })
      .filter(s => s !== undefined)

    if (!stateFiles) {
      return undefined
    }

    let results = {}

    for (const { path, name } of stateFiles) {
      const { sourceFile } = utils.ast(path)

      let stateProps = {}

      sourceFile.getDescendantsOfKind(SyntaxKind.InterfaceDeclaration).forEach(c => {
        c.getProperties().forEach(c1 => {
          stateProps[c1.getChildAtIndex(0).getText()] = c1.getChildAtIndex(2).getText()
        })
      })

      results[name] = stateProps
    }

    return results
  }

  /**
   * Get all named thunk actions
   */
  async thunkActions(): Promise<NamedThunkActions> {
    const {
      filesystem: { inspectTree },
      utils,
    } = this.context

    const tree = await inspectTree('src/store/actions')
    if (!tree || !tree.children || !tree.children.length) {
      return undefined
    }

    const files = tree.children
      // @ts-ignore
      .filter(r => r.type === 'file')
      // @ts-ignore
      .map(r => ({ name: r.name, path: 'src/store/actions/' + r.name }))

    let results = {}
    for (const file of files) {
      const { sourceFile } = utils.ast(file.path)

      sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration).forEach(c => {
        let params = {}
        c.getParameters().forEach(p => {
          params[p.getFirstChild().getText()] = p.getLastChild().getText()
        })

        // c.getParameter('payload').getText()
        results[c.getName()] = <ThunkActionInfo>{
          file: file.name,
          params,
        }
      })
    }

    return results
  }

  /**
   * Ensure all redux packages are installed
   * and wrap root component with Store Provider.
   */
  async init() {
    const {
      init,
      npm,
      filesystem: { exists },
      utils,
    } = this.context

    await init()
    await npm.ensurePackages(['anoa', 'react-redux', 'redux', 'redux-thunk'], false)
    await npm.ensurePackages(['@types/react-redux'], true)

    const ast = utils.ast('src/App.tsx')

    if (!(await exists('src/store/index.ts'))) {
      await utils.generate('shared/src/store/', 'src/store/', ['index.ts'])
    }

    ast.wrapJsxTag('App', 'renderMain', 'AppStore.Provider')
    ast.addNamedImports('./store', ['AppStore'])
    ast.sortImports()
    ast.save()
  }

  /**
   * Update reducers exports.
   */
  async updateReducers() {
    const reducers = await this.reducerList()
    await this.context.utils.generate(
      'shared/src/store/reducers/',
      `src/store/reducers/`,
      ['index.ts'],
      {
        reducers,
      },
    )
  }

  /**
   * Get list of reducers.
   */
  async reducerList() {
    const {
      strings: { camelCase, pascalCase, kebabCase },
    } = this.context
    return (await this.reducerObjectList()).map(r => ({
      name: camelCase(r.name),
      val: pascalCase(r.name),
      dir: kebabCase(r.name),
    }))
  }

  async reducerObjectList() {
    return await this.context.utils.dirList('src/store/reducers')
  }
}

export function reduxStore(context: RootContext) {
  return new ReduxStore(context)
}
