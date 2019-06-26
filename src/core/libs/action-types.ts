import * as path from 'path'
import { SyntaxKind, TypeAliasDeclaration } from 'ts-morph'
import { ActionTypeClause } from '../types'
import { Lib } from './lib'
import { Reducer } from './reducer'

export class ActionTypes extends Lib {
  name: string

  private alias: TypeAliasDeclaration
  private fields: ActionTypeClause[]

  constructor(reducer: Reducer) {
    super(reducer.context)
    const { sourceFile } = reducer

    this.name = sourceFile
      .getImportDeclaration(
        i =>
          !!i
            .getModuleSpecifier()
            .getText()
            .match(/.\/actions/g)
      )
      .getNamedImports()[0]
      .getText()

    const actionTypesPath = path.join(
      sourceFile.getDirectoryPath(),
      'actions.ts'
    )

    this.sourceFile = this.context.tools
      .source()
      .project.addExistingSourceFile(actionTypesPath)
  }

  getClauses(): ActionTypeClause[] {
    if (this.fields) {
      return this.fields
    }

    const actionTypesAlias = this.getAliasDeclaration()
    const actionTypes = actionTypesAlias.getTypeNode().getText()
    if (actionTypes !== 'any') {
      const literals = actionTypesAlias.getDescendantsOfKind(
        SyntaxKind.TypeLiteral
      )
      return (this.fields = literals.map<ActionTypeClause>(p => {
        const members = p.getMembers()
        const type = members[0]
          .getText()
          .split(':')[1]
          .trim()
        if (members.length > 1) {
          return {
            type,
            payload: members[1]
              .getText()
              .split(':')[1]
              .trim()
          }
        }

        return {
          type
        }
      }))
    }

    return (this.fields = [])
  }

  addFields(fields: ActionTypeClause[]) {
    if (!fields || !fields.length) {
      return
    }

    const actionTypesAlias = this.getAliasDeclaration()
    let actionTypes = actionTypesAlias.getTypeNode().getText()
    if (actionTypes === 'any') {
      actionTypes = ''
    } else {
      actionTypes += ' | '
    }

    actionTypes += fields
      .map(
        a => `{
      type: '${a.type}'
      ${a.payload ? ', payload: ' + a.payload : ''}
    }`
      )
      .join(' | ')

    actionTypesAlias.setType(actionTypes)
  }

  private getAliasDeclaration(): TypeAliasDeclaration {
    if (this.alias) {
      return this.alias
    }

    return (this.alias = this.sourceFile.getTypeAlias(this.name))
  }
}
