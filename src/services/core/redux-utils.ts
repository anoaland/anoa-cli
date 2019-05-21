import { SourceFile, SyntaxKind, TypeAliasDeclaration } from 'ts-morph'
import { FieldObject } from './object-builder'

export class ReduxUtils {
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
