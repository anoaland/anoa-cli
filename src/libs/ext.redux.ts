import { uniq } from 'ramda'
import { RootContext } from '.'
import {
  SyntaxKind,
  UnionTypeNode,
  TypeLiteralNode,
  PropertySignatureStructure,
} from 'ts-simple-ast'
import { ExportedNamePath, ViewInfo, ViewKind } from './types'

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

interface StateAndThunks {
  states: NamedReducerTypes
  thunks: NamedThunkActions
}

interface KeyValue {
  key: string
  value: string
}

interface DecoratorArgument {
  state: KeyValue[]
  dispatch: KeyValue[]
  stateIndex?: number
  dispatchIndex?: number
}

interface QueryState {
  props: PropertySignatureStructure[]
  map: string[]
}

interface QueryThunk {
  props: PropertySignatureStructure[]
  map: string[]
  imports: Record<string, string[]>
}

interface QueryResult {
  imports: Imports[]
  state: QueryState
  thunk: QueryThunk
}

interface Imports {
  module: string
  namedImports: string[]
}

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

    states = uniq(states.filter(s => !isBlank(s)))
    if (!states) {
      print.error('Reducer state is required')
      process.exit(0)
    }

    await this.init()

    const reduxStates = states.map(s => {
      const st = s.split(':')
      let name = st[0].trim()
      let type = 'any'
      let value = `''`

      if (st.length > 1) {
        const sv = st[1].split('=')
        if (sv.length > 1) {
          type = sv[0].trim()
          value = sv[1].trim()
        } else {
          type = st[1].trim()
          switch (type) {
            case 'number':
              value = '0'
              break
            case 'boolean':
              value = 'false'
              break
          }
        }
      } else {
        const sv = s.split('=')
        if (sv.length > 1) {
          name = sv[0].trim()
          value = sv[1].trim()
        }
      }

      return {
        name: camelCase(name),
        type,
        value,
        optional: name.endsWith('?'),
      }
    })

    const props = {
      name: pascalCase(name),
      states: reduxStates,
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

    if (!stateFiles || !stateFiles.length) {
      return undefined
    }

    let results = {}

    for (const { path, name } of stateFiles) {
      const { sourceFile } = utils.ast(path)

      let stateProps = {}

      sourceFile.getDescendantsOfKind(SyntaxKind.InterfaceDeclaration).forEach(c => {
        c.getProperties().forEach(c1 => {
          let type = c1.getLastChild().getText()

          if (c1.getChildAtIndex(1).getKind() === SyntaxKind.QuestionToken) {
            if (type.indexOf('undefined') < 0) {
              type += ' | undefined'
            }
          }
          stateProps[c1.getFirstChild().getText()] = type
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

    const appAst = utils.ast('src/App.tsx')

    if (!(await exists('src/store/index.ts'))) {
      await utils.generate('shared/src/store/', 'src/store/', ['index.ts'])
    }

    appAst.wrapJsxTag('App', 'renderMain', 'AppStore.Provider')
    appAst.addNamedImports('./store', ['AppStore'])
    appAst.sortImports()
    appAst.addSyntaxToMethod('App', 'prepare', 'await AppStore.init()')
    appAst.save()
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

  async getStateAndThunks(): Promise<StateAndThunks> {
    const states = await this.reducerStates()
    const thunks = await this.thunkActions()
    return {
      states,
      thunks,
    }
  }

  /**
   * Connect store to view.
   */
  async connectStore({ states, thunks }: StateAndThunks, viewInfo?: ViewInfo, kind?: ViewKind) {
    const { prompt, print, view } = this.context

    let dir = ''
    if (!viewInfo) {
      if (!states && !thunks) {
        print.warning('Aborted. There is no state or thunk function in this project.')
        process.exit(0)
        return
      }

      kind = (await prompt.ask({
        name: 'kind',
        message: 'What kind of view would you like to connect to theme?',
        type: 'list',
        choices: ['Component', 'Screen'],
      })).kind

      dir = `src/views/${kind.toLowerCase()}s`
      const viewInfoList = await view.viewInfoList(kind.toLowerCase() as ViewKind)

      if (!viewInfoList.length) {
        print.error(`We could not find any ${kind} in this project.`)
        process.exit(0)
        return
      }

      const { target } = await prompt.ask({
        name: 'target',
        message: `Select the ${kind} you want to connect to`,
        type: 'list',
        choices: viewInfoList.map(v => v.option),
      })

      viewInfo = viewInfoList.find(v => v.option === target)
    } else {
      dir = `src/views/${kind.toLowerCase()}s`
    }

    // ask user for state and thunk which want to be mapped
    const query = await this._queryStateAndThunkToMap(dir, viewInfo, { states, thunks })

    // generate required props interfaces
    await this._generatePropInterfaces(dir, viewInfo, query)

    // connect to view
    switch (viewInfo.type) {
      case 'class':
        this.connectStoreToViewClass(dir, viewInfo, query)
        break

      case 'stateless':
        this.connectStoreToStatelessView(dir, viewInfo, query)
        break

      case 'functional':
        this.connectStoreToStatelessFunctionalView(dir, viewInfo, query)
        break
    }

    print.success(
      `Store was successfully connected to ${print.colors.magenta(
        viewInfo.name,
      )} ${kind.toLowerCase()} on ${print.colors.yellow(`${dir + viewInfo.path}/index.tsx`)}`,
    )
  }

  private async _generatePropInterfaces(
    dir: string,
    { name, path }: ExportedNamePath,
    query: QueryResult,
  ) {
    const { utils } = this.context

    const astProps = await utils.ast(`${dir}${path}/props.tsx`)
    const extendedProps = []

    if (query.state.props.length) {
      const interfaceName = name + 'StateProps'
      astProps.createOrUpdateInterface(interfaceName, query.state.props)
      extendedProps.push(interfaceName)
    }

    if (query.thunk.props.length) {
      const interfaceName = name + 'ActionProps'
      astProps.createOrUpdateInterface(interfaceName, query.thunk.props)
    }

    if (extendedProps.length > 0) {
      astProps.extendsInterface(`${name}Props`, extendedProps, true)
    }

    astProps.save()
  }

  private async _queryStateAndThunkToMap(
    dir: string,
    { name, path }: ExportedNamePath,
    { states, thunks }: StateAndThunks,
  ): Promise<QueryResult> {
    const {
      strings: { pascalCase, camelCase },
      prompt,
      utils,
    } = this.context

    const viewDir = dir + path
    const imports: Imports[] = []
    const stateProps: PropertySignatureStructure[] = []
    const stateMap = []

    const actionProps: PropertySignatureStructure[] = []
    const actionMap = []
    const actionImports = {}

    if (states) {
      const choices = {}
      for (const k of Object.keys(states)) {
        choices[pascalCase(k) + 'State'] = Object.keys(states[k]).map(o => k + '.' + o)
      }

      const { statesToMap } = await prompt.ask([
        {
          name: 'statesToMap',
          type: 'checkbox',
          message: 'Select state(s) you want to map',
          radio: true,
          choices,
        },
      ])

      for (const st of statesToMap) {
        const s = st.split('.')
        const stateType = states[s[0]][s[1]]
        const prop = camelCase(s[0] + '-' + s[1])

        stateProps.push({
          name: prop,
          type: stateType,
        })
        stateMap.push(`${prop}: state.${st}`)
      }

      if (stateProps.length > 0) {
        imports.push({ module: './props', namedImports: [`${name}StateProps`] })
      }
    }

    if (thunks) {
      const choices = []
      for (const k of Object.keys(thunks)) {
        choices.push(`${k}(${JSON.stringify(thunks[k].params).replace(/\"/g, '')})`)
      }

      const { actionsToMap } = await prompt.ask([
        {
          name: 'actionsToMap',
          type: 'checkbox',
          message: 'Select action(s) you want to map',
          radio: true,
          choices,
        },
      ])

      for (const st of actionsToMap as string[]) {
        const a = st.split('(')[0].trim()
        const act = thunks[a]
        const prop = a.substr(0, a.length - 6)
        actionProps.push({
          name: prop,
          type: `(${Object.keys(act.params)
            .map(k => `${k}: ${act.params[k]}`)
            .join(',')}) => void`,
        })
        actionMap.push(
          `${prop}: (${Object.keys(act.params).join(', ')}) => dispatch(${a}(${Object.keys(
            act.params,
          ).join(', ')}))`,
        )

        actionImports[act.file] = [...(actionImports[act.file] || []), a]
      }

      for (const impor of Object.keys(actionImports)) {
        imports.push({
          module: `${utils.relative('src/store', viewDir)}/actions/${impor.substr(
            0,
            impor.length - 3,
          )}`,
          namedImports: actionImports[impor],
        })
      }

      if (actionProps.length > 0) {
        imports.push({ module: './props', namedImports: [`${name}ActionProps`] })
      }
    }

    imports.push({
      module: utils.relative('src/store', `${viewDir}`),
      namedImports: ['AppStore'],
    })

    return {
      imports,
      state: {
        props: stateProps,
        map: stateMap,
      },
      thunk: {
        props: actionProps,
        map: actionMap,
        imports: actionImports,
      },
    }
  }

  connectStoreToViewClass(dir: string, { name, path }: ExportedNamePath, query: QueryResult) {
    const { utils } = this.context
    const viewAst = utils.ast(`${dir + path}/index.tsx`)

    query.imports.forEach(i => {
      viewAst.addNamedImports(i.module, i.namedImports)
    })

    const viewFile = viewAst.sourceFile
    const clazz = viewFile.getClass(name)

    const decoratorFullName = 'AppStore.withStoreClass'
    const generics = []
    const args = []
    let stateArgs = []
    let dispatchArgs = []

    let decorator = clazz.getDecorator(d => d.getFullName() === decoratorFullName)

    if (!decorator) {
      stateArgs = query.state.map
      dispatchArgs = query.thunk.map
    } else {
      const existingArgs: DecoratorArgument = {
        state: [],
        dispatch: [],
      }
      decorator.getArguments().forEach(a => {
        if (a.getKind() === SyntaxKind.ArrowFunction) {
          let identifier = undefined

          a.forEachChild(c => {
            if (c.getKind() === SyntaxKind.Parameter) {
              identifier = c.getText()
            } else if (identifier && c.getKind() === SyntaxKind.ParenthesizedExpression) {
              const c1 = c.getFirstChildByKind(SyntaxKind.ObjectLiteralExpression)
              c1.forEachChild(c2 => {
                const c4 = c2.getChildren()
                existingArgs[identifier].push({
                  key: c4[0].getText(),
                  value: c4[2].getText(),
                })
              })
            }
          })
        }
      })

      const stateArgsToAdd = query.state.map.filter(s => {
        const key = s.split(':')[0]
        const h = existingArgs.state.find(a => a.key === key)
        return !!!h
      })

      const dispatchArgsToAdd = query.thunk.map.filter(s => {
        const key = s.split(':')[0]
        const h = existingArgs.dispatch.find(a => a.key === key)
        return !!!h
      })

      stateArgs = [...stateArgsToAdd, ...existingArgs.state.map(a => a.key + ': ' + a.value)]

      dispatchArgs = [
        ...dispatchArgsToAdd,
        ...existingArgs.dispatch.map(a => a.key + ': ' + a.value),
      ]

      decorator.remove()
    }

    if (stateArgs.length > 0) {
      args.push(`state => ({ ${stateArgs.join(',')} })`)
      generics.push(`${name}StateProps`)
    }

    if (dispatchArgs.length > 0) {
      if (args.length === 0) {
        args.push('null')
        generics.push(`any`)
      }

      generics.push(`${name}ActionProps`)
      args.push(`dispatch => ({ ${dispatchArgs.join(',')} })`)
    }

    clazz.addDecorator({
      name: `${decoratorFullName}<${generics.join(',')}>`,
      arguments: args,
    })

    viewAst.sortImports()
    viewAst.save()
  }

  connectStoreToStatelessView(dir: string, { name, path }: ExportedNamePath, query: QueryResult) {
    this.context.print.warning(
      `Sorry this action is not supported yet. Please wait until next release.`,
    )
  }

  connectStoreToStatelessFunctionalView(
    dir: string,
    { name, path }: ExportedNamePath,
    query: QueryResult,
  ) {
    this.context.print.warning(
      `Sorry this action is not supported yet. Please wait until next release.`,
    )
  }
}

export function reduxStore(context: RootContext) {
  return new ReduxStore(context)
}
