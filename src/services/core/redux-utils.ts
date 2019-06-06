import * as path from 'path'
import {
  ClassDeclaration,
  Node,
  Project,
  SourceFile,
  SyntaxKind,
  TypeAliasDeclaration
} from 'ts-morph'
import { RootContext } from '../../libs'
import { FieldObject } from './object-builder'
import { NamePathInfo } from './project-browser'
import { ReactUtils } from './react-utils'

export class ReduxUtils {
  /***
   * Get reducer action types
   */
  static resolveActionTypes(
    context: RootContext,
    project: Project,
    reducer: NamePathInfo,
    throwErrorIfNotFound: boolean = true
  ) {
    const {
      print,
      strings: { trim }
    } = context

    const sourceFile = ReactUtils.getSourceFileInSameFolder(
      context,
      project,
      path.dirname(reducer.path),
      'actions.ts'
    )
    if (!sourceFile) {
      if (throwErrorIfNotFound) {
        print.error(`Can't find actions.ts file.`)
        process.exit(1)
      }
      return undefined
    }

    const actionName = ReactUtils.getNamedImport(
      reducer.sourceFile,
      /.\/actions/g
    )

    const typeAlias = sourceFile.getTypeAlias(actionName)
    return {
      sourceFile,
      typeAlias,
      actionTypeChoices(): { [key: string]: ActionTypeInfo } {
        const literals = typeAlias.getDescendantsOfKind(SyntaxKind.TypeLiteral)
        return literals
          .map<ActionTypeInfo>(p => {
            const members = p.getMembers()
            const type = trim(members[0].getText().split(':')[1])
            if (members.length > 1) {
              return {
                type,
                payload: trim(members[1].getText().split(':')[1])
              }
            }

            return {
              type
            }
          })

          .map<{ key: string; value: ActionTypeInfo }>(p => {
            let key =
              print.colors.blue('type') + ': ' + print.colors.yellow(p.type)

            if (p.payload) {
              key +=
                ', ' +
                print.colors.blue('payload') +
                ': ' +
                print.colors.yellow(p.payload)
            }

            p.data = reducer
            return {
              key,
              value: p
            }
          })

          .reduce((acc, cur) => {
            acc[cur.key] = cur.value
            return acc
          }, {})
      }
    }
  }

  static resolveStates(
    context: RootContext,
    project: Project,
    reducer: NamePathInfo,
    throwErrorIfNotFound: boolean = true
  ): ReducerStateInfo {
    const { print } = context

    const sourceFile = ReactUtils.getSourceFileInSameFolder(
      context,
      project,
      path.dirname(reducer.path),
      'state.ts'
    )
    if (!sourceFile) {
      if (throwErrorIfNotFound) {
        print.error(`Can't find state.ts file.`)
        process.exit(1)
      }
      return undefined
    }

    const stateName = ReactUtils.getNamedImport(reducer.sourceFile, /.\/state/g)

    const stateInterface = sourceFile.getInterface(stateName)
    return {
      state: {
        name: stateName,
        path: sourceFile.getFilePath(),
        sourceFile
      },
      reducer,
      stateChoices(): { [key: string]: FieldObject } {
        const fields = ReactUtils.getInterfaceFields(stateInterface)

        return fields
          .map<{ key: string; value: FieldObject }>(p => {
            const key =
              print.colors.blue(p.name) + ': ' + print.colors.yellow(p.type)

            p.data = reducer
            return {
              key,
              value: p
            }
          })
          .reduce((acc, cur) => {
            acc[cur.key] = cur.value
            return acc
          }, {})
      }
    }
  }

  static async addActionTypeClauses(
    reducerSourceFile: SourceFile,
    actionTypes: FieldObject[]
  ) {
    if (!actionTypes || !actionTypes.length) {
      return
    }

    const caseBlock = reducerSourceFile.getFirstDescendantByKind(
      SyntaxKind.CaseBlock
    )
    const clauses = caseBlock.getClauses()

    const updatedClauses = clauses
      .filter(c => c.getKindName() !== 'DefaultClause')
      .map(c => c.getText() + '\r\n')

    updatedClauses.push(
      ...actionTypes.map(
        a => `case '${a.name}':
          return { ...state }
        `
      )
    )

    updatedClauses.push(
      clauses.find(c => c.getKindName() === 'DefaultClause').getText()
    )

    caseBlock.replaceWithText(`{ ${updatedClauses.join('')} }`)
  }

  static async generateNewActionTypes(
    actionTypesAlias: TypeAliasDeclaration,
    newActionTypes: FieldObject[]
  ) {
    if (!newActionTypes || !newActionTypes.length) {
      return
    }

    let actionTypes = actionTypesAlias.getTypeNode().getText()
    if (actionTypes === 'any') {
      actionTypes = ''
    } else {
      actionTypes += ' | '
    }

    actionTypes += newActionTypes
      .map(
        a => `{
      type: '${a.name}'
      ${a.type ? ', payload: ' + a.type : ''}
    }`
      )
      .join(' | ')

    actionTypesAlias.setType(actionTypes)
  }

  static getThunksFromSourceFile(sourceFile: SourceFile): ThunkInfo[] {
    const thunks = sourceFile.getFunctions().filter(f => {
      const rtn = f.getReturnTypeNode()
      return rtn && rtn.getText().startsWith('AppThunkAction')
    })

    const filePath = sourceFile.getFilePath()
    return thunks.map<ThunkInfo>(t => {
      const rtMatch = t
        .getReturnTypeNode()
        .getText()
        .match(/<(.*?)>$/g)

      const returnType = rtMatch
        ? rtMatch[0].substr(1, rtMatch[0].length - 1)
        : 'void'

      return {
        name: t.getName(),
        parameters: t.getParameters().map<FieldObject>(p => ({
          name: p.getName(),
          type: p.getTypeNode().getText(),
          optional: false
        })),
        path: filePath,
        returnType
      }
    })
  }

  static getReducerVariablesMap(
    context: RootContext
  ): { [key: string]: string } {
    const {
      folder,
      filesystem: { cwd }
    } = context
    const project = new Project()
    const reducerSourceFile = project.addExistingSourceFile(
      path.join(cwd(), folder.reducers('index.ts'))
    )
    const reducerVars = reducerSourceFile
      .getVariableDeclaration('reducers')
      .getInitializer()
      .getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression)

    return reducerVars
      .getProperties()
      .map(p => {
        const s = p.getText().split(':')
        return { key: s[1].trim(), value: s[0].trim() }
      })
      .reduce((acc, curr) => {
        acc[curr.key] = curr.value
        return acc
      }, {})
  }

  static setAppStoreDecorator(
    viewClass: ClassDeclaration,
    typeArgs: string[],
    statesMap: NameValue[],
    actionsMap: NameValue[]
  ) {
    const dec = viewClass.getDecorator(d =>
      d.getFullName().startsWith('AppStore.withStoreClass')
    )

    let stateInfo: StoreDecoratorArgInfo
    let actionInfo: StoreDecoratorArgInfo

    if (!dec) {
      if (statesMap.length) {
        stateInfo = {
          name: 'state',
          args: statesMap.map(a => ({
            name: a.name,
            value: a.value.replace('#state', 'state')
          }))
        }
      }

      if (actionsMap.length) {
        actionInfo = {
          name: 'dispatch',
          args: actionsMap.map(a => ({
            name: a.name,
            value: a.value.replace('#dispatch', 'dispatch')
          }))
        }
      }
    } else {
      const existingTypeArgs = dec.getTypeArguments().map(a => a.getText())
      typeArgs =
        existingTypeArgs.length >= typeArgs.length ? existingTypeArgs : typeArgs
      const args = dec.getArguments()
      if (args.length) {
        stateInfo = this.mergeDecoratorArgs(args[0], statesMap, '#state')

        if (args.length > 1) {
          actionInfo = this.mergeDecoratorArgs(args[1], actionsMap, '#dispatch')
        }
      }
      dec.remove()
    }

    const decoratorArgs: string[] = []
    if (stateInfo) {
      decoratorArgs.push(
        `${stateInfo.name} => ({ ${stateInfo.args
          .map(t => `${t.name}:${t.value}`)
          .join(',')} })`
      )
    }

    if (actionInfo) {
      if (!decoratorArgs.length) {
        decoratorArgs.push('null')
      }
      decoratorArgs.push(
        `${actionInfo.name} => ({ ${actionInfo.args
          .map(t => `${t.name}:${t.value}`)
          .join(',')} })`
      )
    }

    viewClass.addDecorator({
      name: `AppStore.withStoreClass<${typeArgs.join(',')}>`,
      arguments: decoratorArgs
    })
  }

  static getDecoratorInfo(node: Node): StoreDecoratorArgInfo {
    const name = node.getFirstDescendantByKind(SyntaxKind.Identifier).getText()
    const args = node
      .getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression)
      .getChildrenOfKind(SyntaxKind.PropertyAssignment)
      .map<NameValue>(a => {
        const s = a.getText().split(':')
        return {
          name: s[0].trim(),
          value: s[1].trim()
        }
      })

    return {
      name,
      args
    }
  }

  static mergeDecoratorArgs(
    node: Node,
    values: NameValue[],
    target: '#state' | '#dispatch'
  ): StoreDecoratorArgInfo {
    const info = this.getDecoratorInfo(node)
    const varName = info.name
    const { args } = info
    for (const m of values) {
      if (!args.find(s => s.name === m.name)) {
        args.push({
          name: m.name,
          value: m.value.replace(target, varName)
        })
      }
    }

    return {
      name: varName,
      args
    }
  }
}

export interface ActionTypeInfo {
  type: string
  payload?: string
  data?: any
}

export interface ThunkInfo {
  name: string
  parameters: FieldObject[]
  returnType: string
  path: string
}

export interface ReducerStateInfo {
  reducer: NamePathInfo
  state: NamePathInfo
  stateChoices(): { [key: string]: FieldObject<NamePathInfo> }
}

export interface StoreDecoratorArgInfo {
  name: string
  args: NameValue[]
}

export interface NameValue {
  name: string
  value: string
}
