import { uniq } from 'ramda'
import { RootContext } from '.'
import {
  SyntaxKind,
  UnionTypeNode,
  TypeLiteralNode,
  PropertySignatureStructure,
  VariableDeclarationKind,
  VariableStatement,
  Node,
  InterfaceDeclaration,
  PropertySignature,
} from 'ts-simple-ast'
import { ExportedNamePath, ViewInfo, ViewKind } from './types'

interface ReducerActionInfo {
  type: string
  payload: string
}

interface ThunkActionInfo {
  file: string
  name: string
  params: Record<string, string>
}

type NamedReducerActions = Record<string, ReducerActionInfo[]>

type NamedReducerTypes = Record<string, Record<string, string>>

type NamedThunkActions = Record<string, Record<string, ThunkActionInfo>>

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
  async createReducer(name: string, states: string[], actions: string[]) {
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
    if (!states.length) {
      print.error('Reducer state is required')
      process.exit(0)
    }

    actions = uniq(actions.filter(s => !isBlank(s)))
    if (!actions.length) {
    }

    await this.init()

    const reduxStates = this._convertArrayToReduxStates(states)
    const reduxActionTypes = this._convertArrayToReduxActions(actions)

    const props = {
      name: pascalCase(name),
      states: reduxStates,
      actions: reduxActionTypes,
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
   * Add new action creator.
   * @param name Action function name
   * @param type Action type
   */
  async createActionThunk(name: string, type: string, payloadType: string) {
    const {
      prompt,
      strings: { kebabCase, camelCase, isBlank },
      utils,
      print,
      filesystem: { read },
    } = this.context

    if (isBlank(name)) {
      print.error('Action name is required')
      process.exit(0)
    }

    if (isBlank(type)) {
      print.error('Action type is required')
      process.exit(0)
    }

    const dir = `src/store/actions/`

    let hasAction = true
    const actionFiles = await utils.fileList('src/store/actions')
    if (!actionFiles || !actionFiles.length) {
      hasAction = false
    }

    let isNewFile = true
    let filename = ''
    if (!hasAction) {
      filename = (await prompt.ask([
        {
          type: 'input',
          name: 'filename',
          message: 'Save this action to file name:',
        },
      ])).filename
    } else {
      const optNewFile = 'New file'
      const optExistingFile = 'Existing file'
      const { saveTo } = await prompt.ask([
        {
          name: 'saveTo',
          message: 'Save this action to:',
          type: 'list',
          choices: [optNewFile, optExistingFile],
        },
      ])

      if (saveTo === optNewFile) {
        filename = (await prompt.ask([
          {
            type: 'input',
            name: 'filename',
            message: 'Name of file:',
          },
        ])).filename
      } else {
        filename = (await prompt.ask([
          {
            name: 'filename',
            message: 'Select file:',
            type: 'list',
            choices: actionFiles.map(f => f.name),
          },
        ])).filename
        isNewFile = false
      }
    }

    if (isBlank(filename)) {
      print.error('File name is required.')
      process.exit(0)
      return
    }

    let oldFileContents = ''
    if (isNewFile) {
      // force .ts extentions
      const nameParts = filename.split('.')
      filename = kebabCase(nameParts[0]) + '.ts'
    } else {
      oldFileContents = read(dir + filename)
    }

    await this.init()

    const props = {
      name,
      type,
      camelCase,
      payloadType,
      oldFileContents,
      useImport: isBlank(oldFileContents),
    }

    await utils.generate(
      'shared/src/store/actions/',
      dir,
      [{ source: 'action.ts', dest: filename }],
      props,
    )

    print.success(
      'New action was successfully created on ' +
        print.colors.yellow(`src/store/actions/${filename}`),
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
    let info: ReducerActionInfo[] = []

    const parseProperty = (node: UnionTypeNode | TypeLiteralNode) => {
      // @ts-ignore
      let obj: ReducerActionInfo = {}
      node.getDescendantsOfKind(SyntaxKind.PropertySignature).forEach(c1 => {
        const flds = c1.getText().split(':')
        const key = flds[0].trim()
        const val = flds[1].split(';')[0].trim()

        obj[key] = key === 'type' ? val.slice(1, val.length - 1) : val
      })
      info.push(obj)
    }

    actionFiles.forEach(f => {
      info = []

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

    function getPropInfo(ps: PropertySignature) {
      const type = ps.getType().getText()
      return {
        name: ps.getName(),
        type: type.indexOf('.') > -1 ? type.split('.')[1] : type,
      }
    }

    for (const { path, name } of stateFiles) {
      const { sourceFile } = utils.ast(path)

      let stateProps = {}

      sourceFile.getDescendantsOfKind(SyntaxKind.InterfaceDeclaration).forEach(c => {
        // get state properties from base interface
        c.getBaseDeclarations().forEach((i: InterfaceDeclaration) => {
          i.getProperties().forEach(ps => {
            const pi = getPropInfo(ps)
            stateProps[pi.name] = pi.type
          })
        })

        // get state properties
        c.getProperties().forEach(ps => {
          const pi = getPropInfo(ps)
          stateProps[pi.name] = pi.type
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

    const results = {}
    for (const file of files) {
      const { sourceFile } = utils.ast(file.path)
      const thunkFunctions = {}
      sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration).forEach(c => {
        let params = {}
        c.getParameters().forEach(p => {
          params[p.getFirstChild().getText()] = p.getLastChild().getText()
        })

        // c.getParameter('payload').getText()
        thunkFunctions[c.getName()] = <ThunkActionInfo>{
          name: c.getName(),
          file: file.name,
          params,
        }
      })
      results[file.name] = thunkFunctions
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

  async getReducerAndThunks(): Promise<StateAndThunks> {
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
        message: 'Select kind of view:',
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
        message: `Select the ${kind}:`,
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

    let success = false

    // connect to view
    switch (viewInfo.type) {
      case 'class':
        success = this.connectStoreToViewClass(dir, viewInfo, query)
        break

      case 'stateless':
        success = this.connectStoreToStatelessView(dir, viewInfo, query)
        break

      case 'functional':
        success = this.connectStoreToStatelessFunctionalView(dir, viewInfo, query)
        break

      case 'hoc':
        success = this.connectStoreToHocView(dir, viewInfo, query)
        break
    }

    if (success) {
      print.success(
        `Store was successfully connected to ${print.colors.magenta(
          viewInfo.name,
        )} ${kind.toLowerCase()} on ${print.colors.yellow(`${dir + viewInfo.path}/index.tsx`)}`,
      )
    }
  }

  private async _generatePropInterfaces(
    dir: string,
    { name, path }: ExportedNamePath,
    query: QueryResult,
  ) {
    const { utils } = this.context

    const astProps = await utils.ast(`${dir}${path}/props.ts`)
    const extendedProps = []

    if (query.state.props.length) {
      const interfaceName = name + 'StateProps'
      astProps.createOrUpdateInterface(interfaceName, query.state.props)
      extendedProps.push(interfaceName)
    }

    if (query.thunk.props.length) {
      const interfaceName = name + 'ActionProps'
      astProps.createOrUpdateInterface(interfaceName, query.thunk.props)
      extendedProps.push(interfaceName)
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
          message: 'Select state(s) you want to map:',
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
      const thunksMap: Record<string, ThunkActionInfo> = {}
      const choices = {}

      for (const k of Object.keys(thunks)) {
        choices[k] = []
        for (const thk of Object.keys(thunks[k])) {
          const t = thunks[k][thk]
          choices[k].push(`${t.name}(${JSON.stringify(t.params).replace(/\"/g, '')})`)
          thunksMap[t.name] = t
        }
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
        const act = thunksMap[a]
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
    const decorator = clazz.getDecorator(d => d.getFullName() === decoratorFullName)

    const { args, generics } = this._buildStoreMapArgs(
      name,
      decorator ? decorator.getArguments() : [],
      query,
    )

    if (decorator) {
      decorator.remove()
    }

    clazz.addDecorator({
      name: `${decoratorFullName}<${generics.join(',')}>`,
      arguments: args,
    })

    viewAst.sortImports()
    viewAst.save()

    return true
  }

  connectStoreToStatelessView(dir: string, { name, path }: ExportedNamePath, query: QueryResult) {
    const { utils, print } = this.context
    const viewAst = utils.ast(`${dir + path}/index.tsx`)

    const viewFile = viewAst.sourceFile
    const func = viewFile.getFunction(name)

    if (!func) {
      print.warning(`Could not connect store to ${name}.`)
      return false
    }

    func.rename('_' + name)
    func.setIsExported(false)

    const varStmt = viewFile.addVariableStatement({
      declarations: [{ name }],
      declarationKind: VariableDeclarationKind.Const,
      isExported: true,
    })

    this.updateStoreHocConnection(varStmt, query)

    query.imports.forEach(i => {
      viewAst.addNamedImports(i.module, i.namedImports)
    })
    viewAst.sortImports()
    viewAst.save()

    return true
  }

  connectStoreToStatelessFunctionalView(
    dir: string,
    { name, path }: ExportedNamePath,
    query: QueryResult,
  ) {
    const { utils, print } = this.context
    const viewAst = utils.ast(`${dir + path}/index.tsx`)
    const viewFile = viewAst.sourceFile

    // treat as HOC
    let varStmt = viewFile.getVariableStatement(fn => {
      return !!fn.getStructure().declarations.find(d => d.name === name)
    })

    if (!varStmt) {
      print.warning(`Could not connect store to ${name}.`)
      return false
    }

    this.updateStoreHocConnection(varStmt, query)

    // Modify main arrow function
    const arrowFns = varStmt.getDescendantsOfKind(SyntaxKind.ArrowFunction)
    if (arrowFns && arrowFns.length > 0) {
      const arrowFn = arrowFns[arrowFns.length - 1]
      let param = undefined
      let block = undefined

      arrowFn.forEachChild(c => {
        if (c.getKind() === SyntaxKind.Parameter && !param) {
          param = c.getText()
        }

        if (c.getKind() === SyntaxKind.Block && !block) {
          block = c.getText()
        }
      })

      if (!param) {
        param = `props: ${name}Props`
      }

      if (param.indexOf(':') < 0) {
        param += `: ${name}Props`
      }

      if (!block) {
        print.error('Could not connect theme to this component')
        process.exit(0)
        return
      }

      arrowFn.replaceWithText(`(${param}) => ${block}`)
    }

    query.imports.forEach(i => {
      viewAst.addNamedImports(i.module, i.namedImports)
    })

    viewAst.sortImports()
    viewAst.save()

    return false
  }

  connectStoreToHocView(dir: string, { name, path }: ExportedNamePath, query: QueryResult) {
    const { utils, print } = this.context
    const viewAst = utils.ast(`${dir + path}/index.tsx`)
    const viewFile = viewAst.sourceFile

    let varStmt = viewFile.getVariableStatement(fn => {
      return !!fn.getStructure().declarations.find(d => d.name === name)
    })

    if (!varStmt) {
      print.warning(`Could not connect store to ${name}.`)
      return false
    }

    this.updateStoreHocConnection(varStmt, query)

    query.imports.forEach(i => {
      viewAst.addNamedImports(i.module, i.namedImports)
    })
    viewAst.sortImports()
    viewAst.save()

    return true
  }

  updateStoreHocConnection(stmt: VariableStatement, query: QueryResult) {
    const dec = stmt.getDeclarations()[0]

    let initializer = dec.getInitializer()
    let withStoreCallExp: Node

    const name = dec.getName()

    if (dec.getType()) {
      dec.removeType()
    }

    if (!initializer) {
      initializer = dec.setInitializer(`AppStore.withStore()(_${name})`).getInitializer()
    }

    withStoreCallExp = initializer.getFirstDescendant(
      c =>
        c.getKind() === SyntaxKind.CallExpression && c.getText().startsWith('AppStore.withStore'),
    )

    if (!withStoreCallExp) {
      initializer = dec
        .setInitializer(`AppStore.withStore()(${initializer.getText()})`)
        .getInitializer()

      withStoreCallExp = initializer.getFirstDescendant(
        c =>
          c.getKind() === SyntaxKind.CallExpression && c.getText().startsWith('AppStore.withStore'),
      )
    }

    if (withStoreCallExp) {
      const nodes: Node[] = []
      withStoreCallExp.forEachChild(c => {
        nodes.push(c)
      })

      const { args, generics } = this._buildStoreMapArgs(name, nodes, query)
      withStoreCallExp.replaceWithText(
        `AppStore.withStore<${generics.join(',')}>(${args.join(',')})`,
      )
    } else {
      throw new Error('Could not create call expression for AppStore.withStore.')
    }
  }

  async addNewReducerStateProperties({ states }: StateAndThunks) {
    const {
      print,
      prompt,
      strings: { isBlank, pascalCase, kebabCase },
      utils,
    } = this.context

    if (!states) {
      print.warning('Aborted. No reducer found in this project.')
      process.exit(0)
      return
    }

    const keys = Object.keys(states)

    const { key } = await prompt.ask([
      {
        name: 'key',
        type: 'list',
        message: 'Select state:',
        choices: keys,
      },
    ])

    if (!key) {
      print.error('State is required')
      process.exit(0)
      return
    }

    const { properties } = await prompt.ask([
      {
        type: 'input',
        name: 'properties',
        message: `Field(s) (separated with space, eg: foo:string='some value' bar:number=26):`,
      },
    ])

    if (isBlank(properties)) {
      print.error('Field(s) is required')
      process.exit(0)
      return
    }

    const dir = `src/store/reducers/${kebabCase(key)}/`

    // modify state.ts
    const astState = utils.ast(dir + 'state.ts')
    const intf = astState.getDefaultExportDeclaration() as InterfaceDeclaration

    if (intf.getKind() !== SyntaxKind.InterfaceDeclaration) {
      throw new Error(`Can't find state interface declaration on ${dir}state.ts`)
    }

    const reduxStates = this._convertArrayToReduxStates(properties.split(' ').map(s => s.trim()))
    reduxStates.forEach(s => {
      intf.addProperty({
        name: s.name,
        hasQuestionToken: s.optional,
        type: s.type,
      })
    })
    astState.save()

    // modify index.ts

    const astIndex = utils.ast(dir + 'index.ts')
    const astIndexExp = astIndex.getDefaultExportExpression()
    const astIndexDec = astIndex.sourceFile.getVariableDeclaration(astIndexExp)
    const astIndexFn = astIndexDec.getInitializerIfKind(SyntaxKind.ArrowFunction)

    if (!astIndexFn) {
      throw new Error('Could not resolve arrow function on: ' + dir + 'index.ts')
    }

    // get state parameters
    const astIndexParam = astIndexFn.getParameter('state')
    const stateParams = astIndexParam.getFirstChildByKind(SyntaxKind.ObjectLiteralExpression)

    // iterate new states
    reduxStates.forEach(s => {
      // assign new state parameters
      stateParams.addPropertyAssignment({
        name: s.name,
        initializer: s.value,
      })
    })

    // done!
    astIndex.save()

    print.success(
      `New field(s) was successfully added to ${print.colors.magenta(
        `${pascalCase(key)}State`,
      )} on ${print.colors.yellow(`${astIndex.filepath}`)}`,
    )
  }

  async addNewActionType({ states }: StateAndThunks) {
    const {
      print,
      prompt,
      strings: { isBlank, pascalCase, snakeCase, kebabCase },
      utils,
    } = this.context

    if (!states) {
      print.warning('Aborted. No reducer found in this project.')
      process.exit(0)
      return
    }

    const keys = Object.keys(states)

    const { key } = await prompt.ask([
      {
        name: 'key',
        type: 'list',
        message: 'Select reducer:',
        choices: keys,
      },
    ])

    if (!key) {
      print.error('Reducer is required')
      process.exit(0)
      return
    }

    const { name } = await prompt.ask([
      {
        type: 'input',
        name: 'name',
        message: `Action type name:`,
      },
    ])

    if (isBlank(name)) {
      print.error('Action type name is required')
      process.exit(0)
      return
    }

    const { payload } = await prompt.ask([
      {
        type: 'input',
        name: 'payload',
        message: `Payload type (optional):`,
      },
    ])

    const dir = `src/store/reducers/${kebabCase(key)}/`

    // modify actions.ts

    const astAction = utils.ast(dir + 'actions.ts')
    const actActionExp = astAction.sourceFile.getTypeAlias(astAction.getDefaultExportExpression())
    const actTypes = actActionExp.getFirstChild(c => {
      return c.getKind() === SyntaxKind.TypeLiteral || c.getKind() === SyntaxKind.UnionType
    })

    let newActTypes = actTypes.getText()
    newActTypes += ` | { type: '${snakeCase(key).toUpperCase()}/${snakeCase(
      name,
    ).toUpperCase()}'         
        ${payload ? `payload:${payload}` : ''}
     }`

    actTypes.replaceWithText(newActTypes)
    astAction.save()

    // modify index.ts

    const astIndex = utils.ast(dir + 'index.ts')
    const astIndexExp = astIndex.getDefaultExportExpression()
    const astIndexDec = astIndex.sourceFile.getVariableDeclaration(astIndexExp)
    const astIndexFn = astIndexDec.getInitializerIfKind(SyntaxKind.ArrowFunction)

    if (!astIndexFn) {
      throw new Error('Could not resolve arrow function on: ' + dir + 'index.ts')
    }

    // get switch statement
    const switchStmt = astIndexFn
      .getBody()
      .getDescendantStatements()
      .find(s => s.getKind() === SyntaxKind.SwitchStatement)

    // find case block
    const caseBlock = switchStmt.getFirstChildByKind(SyntaxKind.CaseBlock)
    const clauses = caseBlock.getClauses()
    const caseClauses = clauses
      .filter(c => c.getKind() !== SyntaxKind.DefaultClause)
      .map(c => c.getText())
    const defaultClause = clauses.find(c => c.getKind() == SyntaxKind.DefaultClause)

    // add new switch clause
    caseClauses.push(`case '${snakeCase(key).toUpperCase()}/${snakeCase(name).toUpperCase()}':
    return { ...state }`)

    // build clause statement
    const newClauseStmt =
      caseClauses.join('\r\n') + (defaultClause ? '\r\n' + defaultClause.getText() : '')
    caseBlock.replaceWithText(`{ ${newClauseStmt} }`)

    // done!
    astIndex.save()

    print.success(
      `New action type was successfully added to ${print.colors.magenta(
        `${pascalCase(key)} reducer`,
      )} on ${print.colors.yellow(`${astIndex.filepath}`)}`,
    )
  }

  private _buildStoreMapArgs(name: string, nodeArgs: Node[], query: QueryResult) {
    let generics: string[] = []
    let args: string[] = []
    let stateArgs = []
    let dispatchArgs = []

    if (!nodeArgs || nodeArgs.length === 0) {
      stateArgs = query.state.map
      dispatchArgs = query.thunk.map
    } else {
      const existingArgs: DecoratorArgument = {
        state: [],
        dispatch: [],
      }
      nodeArgs.forEach(a => {
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

    return {
      args,
      generics,
    }
  }

  _convertArrayToReduxStates(states: string[]) {
    return states.map(s => {
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
          if (type.endsWith('[]')) {
            value = '[]'
          } else {
            switch (type) {
              case 'number':
                value = '0'
                break
              case 'boolean':
                value = 'false'
                break
            }
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
        name: this.context.strings.camelCase(name),
        type,
        value,
        optional: name.endsWith('?'),
      }
    })
  }

  _convertArrayToReduxActions(actions: string[]) {
    return actions.map(s => {
      const st = s.split(':')
      let name = st[0].trim()
      let payload = ''

      if (st.length > 1) {
        // has payload
        payload = st[1].trim()
      }

      return {
        name: this.context.strings.camelCase(name),
        payload,
        optional: name.endsWith('?'),
      }
    })
  }
}

export function reduxStore(context: RootContext) {
  return new ReduxStore(context)
}
