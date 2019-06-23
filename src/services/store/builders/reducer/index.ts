import * as path from 'path'
import { Project, SyntaxKind, VariableDeclarationKind } from 'ts-morph'
import { RootContext } from '../../../../core/types'
import { Npm, Source } from '../../../core'
import { ReducerQA } from './qa'
import { ReducerActionTypesGenerator } from './reducer-action-types-generator'
import { ReducerGenerator } from './reducer-generator'
import { ReducerStateGenerator } from './reducer-state-generator'

export class ReducerBuilder {
  context: RootContext
  qa: ReducerQA
  project: Project
  source: Source
  npm: Npm

  constructor(context: RootContext) {
    this.context = context
    this.qa = new ReducerQA(this.context)
    this.project = new Project()
    this.source = new Source(context)
    this.npm = new Npm(context)
  }

  async build() {
    const {
      print: { spin, colors },
      naming,
      folder,
      strings: { kebabCase }
    } = this.context

    await this.qa.run()

    const reducerGenerator = new ReducerGenerator(
      this.context,
      this.project,
      this.qa
    )
    const stateGenerator = new ReducerStateGenerator(
      this.context,
      this.project,
      this.qa
    )
    const actionTypesGenerator = new ReducerActionTypesGenerator(
      this.context,
      this.project,
      this.qa
    )

    const spinner = spin({
      text: 'Generating...'
    }).start()

    // build reducer
    await stateGenerator.generate()
    await actionTypesGenerator.generate()
    await reducerGenerator.generate()

    // build main reducer file
    await this.generateMainFile()

    // ensure core store files
    await this.generateCoreFiles()

    // ensure app main file generated
    await this.generateAppMainFile()

    // ensure package is exists
    await this.npm.installPackagesIfNotExists(
      ['react-redux', 'redux', 'redux-thunk'],
      false
    )
    await this.npm.installPackagesIfNotExists(['@types/react-redux'], true)

    await this.project.save()

    const targetFile = path.join(
      folder.reducers(kebabCase(this.qa.name)),
      'index.ts'
    )

    spinner.succeed(
      `New ${colors.bold(
        naming.store(this.qa.name).reducer()
      )} was successfully created on ${colors.bold(
        targetFile
      )} along with it's action types and state.`
    )
  }

  async generateMainFile() {
    const {
      filesystem: { exists },
      folder,
      naming,
      strings: { kebabCase }
    } = this.context

    const { name } = this.qa

    const mainReducerFileName = folder.reducers('index.ts')
    const isNewStore = !exists(mainReducerFileName)
    const mainReducerSourceFile = isNewStore
      ? this.project.createSourceFile(mainReducerFileName)
      : this.project.addExistingSourceFile(mainReducerFileName)

    if (isNewStore) {
      mainReducerSourceFile.addImportDeclaration({
        moduleSpecifier: 'redux',
        namedImports: ['combineReducers']
      })
    }

    const reducerName = `${naming.store(name).reducer()}`
    const reducerActionTypesName = `${naming.store(name).action()}`

    mainReducerSourceFile.addImportDeclarations([
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
    const reducersVarName = 'reducers'
    const reducersVarStatement =
      mainReducerSourceFile.getVariableStatement(reducersVarName) ||
      mainReducerSourceFile.addVariableStatement({
        isExported: true,
        declarations: [
          {
            name: reducersVarName,
            initializer: `combineReducers({})`
          }
        ],
        declarationKind: VariableDeclarationKind.Const
      })

    const reducerObjLiteral = reducersVarStatement.getDescendantsOfKind(
      SyntaxKind.ObjectLiteralExpression
    )[0]

    if (!reducerObjLiteral) {
      throw new Error('Invalid reducer file.')
    }

    reducerObjLiteral.addPropertyAssignment({
      name,
      initializer: reducerName
    })

    // generate root action types
    const appRootActionsName = naming.store().rootActions()
    const appRootActionType = mainReducerSourceFile.getTypeAlias(
      appRootActionsName
    )

    if (!appRootActionType) {
      mainReducerSourceFile.addTypeAlias({
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
    const appRootStateType = mainReducerSourceFile.getTypeAlias(
      appRootStateName
    )
    if (!appRootStateType) {
      mainReducerSourceFile.addTypeAlias({
        name: appRootStateName,
        type: `ReturnType<typeof ${reducersVarName}>`,
        isExported: true
      })
    }

    await this.source.prettifySoureFile(mainReducerSourceFile)
  }

  async generateCoreFiles() {
    const {
      filesystem: { exists },
      template: { generate },
      folder
    } = this.context

    const indexFilePath = folder.store('index.ts')
    if (!exists(indexFilePath)) {
      const indexContents = await generate({
        template: 'store/index.ts.ejs'
      })
      this.project.createSourceFile(indexFilePath, indexContents)
    }

    const coreFilePath = folder.store('core.tsx')
    if (!exists(coreFilePath)) {
      const coreContents = await generate({
        template: 'store/core.tsx.ejs'
      })
      this.project.createSourceFile(coreFilePath, coreContents)
    }
  }

  async generateAppMainFile() {
    const { folder } = this.context
    const appMainFile = this.project.addExistingSourceFile(
      folder.src('App.tsx')
    )
    if (appMainFile.getImportDeclaration('./store')) {
      return
    }

    // add import store statement

    appMainFile.addImportDeclaration({
      moduleSpecifier: './store',
      namedImports: ['AppStore']
    })

    const appMainClass = appMainFile.getClass('App')
    // make up renderMain function

    const renderMainFunction = appMainClass.getMethod('renderMain')
    const ret = renderMainFunction
      .getBody()
      .getFirstDescendantByKind(SyntaxKind.ReturnStatement)

    const jsxStatement = (
      ret.getFirstDescendantByKind(SyntaxKind.JsxElement) ||
      ret.getFirstDescendantByKind(SyntaxKind.JsxSelfClosingElement)
    ).getText()

    renderMainFunction.setBodyText(`
      return (
        <AppStore.Provider>
          ${jsxStatement}
        </AppStore.Provider>
      )
      `)

    // make up prepare function

    const prepareFunction = appMainClass.getMethod('prepare')
    prepareFunction.setBodyText(`
    ${prepareFunction.getBodyText()}
    await AppStore.init()
    `)

    await this.source.prettifySoureFile(appMainFile)
  }
}
