import * as path from 'path'
import {
  Project,
  PropertySignatureStructure,
  SourceFile,
  StructureKind
} from 'ts-morph'
import { RootContext } from '../../../../libs'
import { Source } from '../../../core'
import { BrowseViewInfo } from '../../../core/project-browser'
import { ReactUtils } from '../../../core/react-utils'
import { NameValue, ReduxUtils } from '../../../core/redux-utils'
import { ViewTypeEnum } from '../../../views/enums'
import { ReduxConnectQA } from './qa'

export class ReduxConnectBuilder {
  context: RootContext
  project: Project
  qa: ReduxConnectQA
  source: Source
  thunkSourceFile: SourceFile

  constructor(context: RootContext) {
    this.context = context
    this.project = new Project()
    this.qa = new ReduxConnectQA(context, this.project)
    this.source = new Source(context)
  }

  async build() {
    await this.qa.run()
    await this.generate()
  }

  async generate() {
    const {
      result: { views }
    } = this.qa

    const {
      print: { spin }
    } = this.context
    const spinner = spin('Generating....')

    for (const view of views) {
      await this.connectToView(view)
    }

    await this.project.save()

    spinner.succeed('Done')
  }

  private async connectToView(view: BrowseViewInfo) {
    const {
      result: { states, thunks }
    } = this.qa
    const {
      filesystem: { exists, cwd },
      naming,
      strings: { camelCase, lowerCase },
      folder,
      print: { spin, colors }
    } = this.context
    const spinner = spin(
      `Connecting store to ${colors.yellow(view.info.name)} ${lowerCase(
        view.kind
      )}...`
    )
    // resolve props
    const propsName = view.info.props || naming.props(view.info.name)
    const propsPath = path.join(path.dirname(view.path), 'props.ts')
    const propsFile = exists(propsPath)
      ? this.project.addExistingSourceFile(propsPath)
      : this.project.createSourceFile(propsPath)
    const propsInterface =
      propsFile.getInterface(propsName) ||
      propsFile.addInterface({ name: propsName, isExported: true })
    const reducerVarsMap = ReduxUtils.getReducerVariablesMap(this.context)
    const typeArgs = []
    const viewFile = this.project.addExistingSourceFile(view.path)
    // resolve state props
    const statesMap: NameValue[] = []
    if (states.length) {
      const propsStateName = naming.stateProps(view.info.name)
      const propsStateInterface = ReactUtils.getOrAddInterface(
        propsFile,
        propsStateName,
        true
      )
      const existingProps = propsStateInterface.getProperties()
      const statesProperties: PropertySignatureStructure[] = []
      for (const s of states) {
        const stateVarName = reducerVarsMap[s.data.name]
        const stateMapName = camelCase(stateVarName + '-' + s.name)
        if (!existingProps.find(p => p.getName() === stateMapName)) {
          statesMap.push({
            name: stateMapName,
            value: `#state.${stateVarName}.${s.name}`
          })
          statesProperties.push({
            name: stateMapName,
            type: s.type,
            hasQuestionToken: s.optional,
            kind: StructureKind.PropertySignature
          })
        }
      }
      propsStateInterface.addProperties(statesProperties)
      ReactUtils.extendsInterface(propsInterface, `Partial<${propsStateName}>`)
      ReactUtils.addNamedImport(viewFile, propsPath, propsStateName)
      typeArgs.push(propsStateName)
    }
    // resolve thunks
    const actionsMap: NameValue[] = []
    if (thunks.length) {
      const propsActionName = naming.actionProps(view.info.name)
      const propsActionInterface = ReactUtils.getOrAddInterface(
        propsFile,
        propsActionName
      )
      const existingProps = propsActionInterface.getProperties()
      const actionProperties: PropertySignatureStructure[] = []
      for (const t of thunks) {
        const thunkFileName = path.basename(t.path).replace(/\.(tsx?)/g, '')
        let actionName = t.name
        if (actionName.endsWith('Action')) {
          actionName = actionName.substr(0, actionName.length - 6)
        }
        const actionNameMap = camelCase(thunkFileName + ' ' + actionName)
        if (!existingProps.find(p => p.getName() === actionNameMap)) {
          const actionParamsMap = t.parameters.length
            ? t.parameters.map(p => p.name).join(', ')
            : ''
          actionsMap.push({
            name: actionNameMap,
            value: `(${actionParamsMap}) => #dispatch(${
              t.name
            }(${actionParamsMap}))`
          })
          const type = `(${
            t.parameters.length
              ? t.parameters
                  .map(p => `${p.name}${p.optional ? '?' : ''}: ${p.type}`)
                  .join(', ')
              : ''
          }) => ${t.returnType}`
          actionProperties.push({
            name: actionNameMap,
            type,
            kind: StructureKind.PropertySignature
          })
          ReactUtils.addNamedImport(viewFile, t.path, t.name)
        }
      }
      propsActionInterface.addProperties(actionProperties)
      ReactUtils.extendsInterface(propsInterface, `Partial<${propsActionName}>`)
      ReactUtils.addNamedImport(viewFile, propsPath, propsActionName)
      if (!typeArgs.length) {
        typeArgs.push('any')
      }
      typeArgs.push(propsActionName)
    }
    // ensure props is imported
    ReactUtils.addImportInterfaceDeclaration(viewFile, propsInterface)
    // ensure AppStore is imported
    ReactUtils.addNamedImport(viewFile, folder.store(), 'AppStore')
    switch (view.info.type) {
      case ViewTypeEnum.classBased:
        const viewClass = viewFile.getClass(view.info.name)
        // set class decorator
        ReduxUtils.setAppStoreDecorator(
          viewClass,
          typeArgs,
          statesMap,
          actionsMap
        )
        // ensure props is referenced
        ReactUtils.addPropsReferenceToClassView(viewClass, propsInterface)
        break
      case ViewTypeEnum.stateless:
        ReduxUtils.setAppStoreHocToFunction(
          viewFile,
          view.info,
          propsName,
          typeArgs,
          statesMap,
          actionsMap
        )
        break
      case ViewTypeEnum.statelessFunctional:
        const viewVar = viewFile.getVariableDeclaration(view.info.name)
        ReduxUtils.setAppStoreHoc(
          viewVar,
          propsName,
          typeArgs,
          statesMap,
          actionsMap
        )
        break
    }
    await this.source.prettifySoureFile(propsFile)
    await this.source.prettifySoureFile(viewFile)

    spinner.succeed(
      `Store was successfully connected to ${colors.yellow(
        view.info.name
      )} ${lowerCase(view.kind)} on ${colors.bold(
        path.relative(cwd(), view.path)
      )}`
    )
  }
}
