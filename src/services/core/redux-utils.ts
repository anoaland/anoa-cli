import * as path from 'path'
import Project, { SourceFile, SyntaxKind, TypeAliasDeclaration } from 'ts-morph'
import { RootContext } from '../../libs'
import { FieldObject } from './object-builder'
import { BrowseReducerInfo } from './project-browser'

export class ReduxUtils {
  static resolveActionTypes(
    context: RootContext,
    project: Project,
    reducer: BrowseReducerInfo
  ) {
    const {
      filesystem: { exists },
      print,
      strings: { trim }
    } = context
    const actionTypesPath = path.join(path.dirname(reducer.path), 'actions.ts')
    if (!exists(actionTypesPath)) {
      print.error(`Can't find actions.ts file.`)
      process.exit(1)
      return
    }

    const sourceFile = project.addExistingSourceFile(actionTypesPath)

    const actionImport = reducer.sourceFile.getImportDeclaration(
      i =>
        !!i
          .getModuleSpecifier()
          .getText()
          .match(/.\/actions/g)
    )

    const typeAlias = sourceFile.getTypeAlias(
      actionImport.getNamedImports()[0].getText()
    )
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
              // '  ' +
              print.colors.blue('type') + ': ' + print.colors.yellow(p.type)

            if (p.payload) {
              key +=
                ', ' +
                print.colors.blue('payload') +
                ': ' +
                print.colors.yellow(p.payload)
            }
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
}

export interface ActionTypeInfo {
  type: string
  payload?: string
}
