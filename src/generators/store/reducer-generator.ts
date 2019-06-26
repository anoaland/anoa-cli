import * as path from 'path'
import { SyntaxKind, VariableDeclarationKind } from 'ts-morph'
import { CreateReducerArgs, RootContext } from '../../core/types'

export class ReducerGenerator {
  private context: RootContext
  private args: CreateReducerArgs

  constructor(context: RootContext) {
    this.context = context
  }

  async generate(args: CreateReducerArgs) {
    const {
      print: { spin, colors },
      tools: { source }
    } = this.context
    const spinner = spin('Generating...')

    this.args = args

    await this.installPackages()
    const { name, filePath } = await this.generateReducerFile()
    await this.generateStateFile()
    await this.generateActionTypes()
    await this.updateReducerRoot()
    await this.updateAppMainFile()
    await this.generateCoreFiles()

    await source().save()
    spinner.succeed(
      `New ${colors.bold(name)} was successfully created on ${colors.bold(
        filePath
      )} along with it's action types and state.`
    )
  }

  private async installPackages() {
    const {
      tools: { npm }
    } = this.context

    await npm().installPackagesIfNotExists(
      ['react-redux', 'redux', 'redux-thunk'],
      false
    )

    await npm().installPackagesIfNotExists(['@types/react-redux'], true)
  }

  private async generateReducerFile() {
    const {
      location,
      name,
      stateFields,
      stateActionTypes,
      customActionTypes
    } = this.args
    const { naming, tools } = this.context

    const targetFile = path.join(location, 'index.ts')
    const storeName = naming.store(name)
    const reducerName = storeName.reducer()
    const reducerStateName = storeName.state()
    const reducerActionTypeName = storeName.action()

    const { project } = tools.source()

    // prepare reducer file
    const reducerFile = project.createSourceFile(targetFile)

    // add imports
    reducerFile.addImportDeclarations([
      {
        moduleSpecifier: 'redux',
        namedImports: ['Reducer']
      },
      {
        moduleSpecifier: './actions',
        namedImports: [reducerActionTypeName]
      },
      {
        moduleSpecifier: './state',
        namedImports: [reducerStateName]
      }
    ])

    // create state initializer
    const stateInitializer = stateFields
      .filter(s => !s.optional)
      .map(s => `${s.name}: ${s.initial}`)
      .join(',')

    let body = stateActionTypes
      .map(
        a => `case '${a.type}':
        return { ...state, ${a.state.name}: action.payload }`
      )
      .join('\r\n')

    if (customActionTypes.length) {
      body +=
        '\r\n' +
        customActionTypes
          .map(
            a => `case '${a.type}':
      return { ...state }`
          )
          .join('\r\n')
    }

    // create exported reducer variable
    reducerFile.addVariableStatement({
      declarations: [
        {
          name: reducerName,
          type: `Reducer<${reducerStateName}, ${reducerActionTypeName}>`,
          initializer: `(state = {
            ${stateInitializer}
          },
          action
          ) => {
            switch (action.type) {
              ${body || ''}          
              default:
                return state
            }
          }`
        }
      ],
      isExported: true,
      declarationKind: VariableDeclarationKind.Const
    })

    return {
      name: reducerName,
      filePath: targetFile
    }
  }

  private async generateStateFile() {
    const { location, name, stateFields } = this.args
    const { naming, tools } = this.context

    const { project } = tools.source()
    const targetFile = path.join(location, 'state.ts')
    const reducerStateName = naming.store(name).state()

    tools
      .ts()
      .createInterface(project, reducerStateName, targetFile, stateFields)
  }

  private async generateActionTypes() {
    const { location, name, stateActionTypes, customActionTypes } = this.args
    const { naming, tools } = this.context

    const targetFile = path.join(location, 'actions.ts')
    const reducerActionTypeName = naming.store(name).action()

    const { project } = tools.source()
    const reducerActionTypesFile = project.createSourceFile(targetFile)
    reducerActionTypesFile.addTypeAlias({
      name: reducerActionTypeName,
      type: [...stateActionTypes, ...customActionTypes]
        .map(
          a => `
        {
          type: '${a.type}',
          payload: ${a.payload}
        }
      `
        )
        .join('|\r\n'),
      isExported: true
    })
  }

  private async updateReducerRoot() {
    const {
      filesystem: { exists },
      folder,
      naming,
      strings: { kebabCase },
      tools
    } = this.context

    const { name } = this.args
    const { project } = tools.source()

    // prepare root file
    const reducerRootFilePath = folder.reducers('index.ts')
    const isNewStore = !exists(reducerRootFilePath)
    const reducerRootSourceFile = isNewStore
      ? project.createSourceFile(reducerRootFilePath)
      : project.addExistingSourceFile(reducerRootFilePath)

    if (isNewStore) {
      reducerRootSourceFile.addImportDeclaration({
        moduleSpecifier: 'redux',
        namedImports: ['combineReducers']
      })
    }

    // import this generated reducer to root
    const reducerName = `${naming.store(name).reducer()}`
    const reducerActionTypesName = `${naming.store(name).action()}`

    reducerRootSourceFile.addImportDeclarations([
      {
        moduleSpecifier: `./${kebabCase(name)}`,
        namedImports: [reducerName]
      },
      {
        moduleSpecifier: `./${kebabCase(name)}/actions`,
        namedImports: [reducerActionTypesName]
      }
    ])

    // generate reducers const
    const reducerRootName = 'reducers'
    const reducersVarStatement =
      reducerRootSourceFile.getVariableStatement(reducerRootName) ||
      reducerRootSourceFile.addVariableStatement({
        isExported: true,
        declarations: [
          {
            name: reducerRootName,
            initializer: `combineReducers({})`
          }
        ],
        declarationKind: VariableDeclarationKind.Const
      })

    const reducers = reducersVarStatement.getDescendantsOfKind(
      SyntaxKind.ObjectLiteralExpression
    )[0]

    if (!reducers) {
      throw new Error('Invalid reducer file.')
    }

    reducers.addPropertyAssignment({
      name,
      initializer: reducerName
    })

    // generate root action types
    const appRootActionsName = naming.store().rootActions()
    const appRootActionType = reducerRootSourceFile.getTypeAlias(
      appRootActionsName
    )

    if (!appRootActionType) {
      reducerRootSourceFile.addTypeAlias({
        name: appRootActionsName,
        type: reducerActionTypesName,
        isExported: true
      })
    } else {
      appRootActionType.setType(
        `${(
          appRootActionType.getFirstChildByKind(SyntaxKind.TypeReference) ||
          appRootActionType.getFirstChildByKind(SyntaxKind.UnionType)
        ).getText()} | ${reducerActionTypesName}`
      )
    }

    // generate root state type
    const appRootStateName = naming.store().rootState()
    const appRootStateType = reducerRootSourceFile.getTypeAlias(
      appRootStateName
    )
    if (!appRootStateType) {
      reducerRootSourceFile.addTypeAlias({
        name: appRootStateName,
        type: `ReturnType<typeof ${reducerRootName}>`,
        isExported: true
      })
    }
  }

  private async updateAppMainFile() {
    const { tools } = this.context
    const { app } = tools.source()

    app.addProvider({
      name: 'AppStore.Provider',
      moduleSpecifier: './store',
      prepareStatement: 'await AppStore.init()'
    })
  }

  private async generateCoreFiles() {
    const {
      filesystem: { exists },
      template: { generate },
      folder,
      tools
    } = this.context

    const indexFilePath = folder.store('index.ts')
    const { project } = tools.source()
    if (!exists(indexFilePath)) {
      const indexContents = await generate({
        template: 'store/index.ts.ejs'
      })
      project.createSourceFile(indexFilePath, indexContents)
    }

    const coreFilePath = folder.store('core.tsx')
    if (!exists(coreFilePath)) {
      const coreContents = await generate({
        template: 'store/core.tsx.ejs'
      })
      project.createSourceFile(coreFilePath, coreContents)
    }
  }
}
