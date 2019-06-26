import {
  PropertyAssignmentStructure,
  StructureKind,
  SyntaxKind
} from 'ts-morph'
import {
  ActionTypeClause,
  FieldObject,
  ReducerInfo,
  RootContext
} from '../types'
import { ActionTypes } from './action-types'
import { Lib } from './lib'
import { ReducerState } from './reducer-state'

export class Reducer extends Lib {
  name: string

  private state: ReducerState
  private actionTypes: ActionTypes

  constructor(context: RootContext, info: ReducerInfo) {
    super(context)
    this.name = info.name
    this.sourceFile = info.sourceFile
    this.attach()
  }

  getState() {
    if (this.state) {
      return this.state
    }

    return (this.state = new ReducerState(this))
  }

  addNewStateFields(fields: FieldObject[]) {
    if (!fields || !fields.length) {
      return
    }

    this.getState().addFields(fields)

    // set fields initializer
    const initializerFields = fields.filter(f => !f.optional && f.initial)

    if (initializerFields.length) {
      const stateInitializer = this.sourceFile
        .getFirstDescendantByKind(SyntaxKind.ArrowFunction)
        .getFirstDescendantByKind(SyntaxKind.Parameter)
        .getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression)

      stateInitializer.addPropertyAssignments(
        initializerFields.map<PropertyAssignmentStructure>(f => ({
          name: f.name,
          initializer: f.initial,
          kind: StructureKind.PropertyAssignment
        }))
      )
    }
  }

  getActionTypes() {
    if (this.actionTypes) {
      return this.actionTypes
    }

    return (this.actionTypes = new ActionTypes(this))
  }

  addActionTypes(fields: ActionTypeClause[]) {
    if (!fields || !fields.length) {
      return
    }

    this.getActionTypes().addFields(fields)

    const caseBlock = this.sourceFile.getFirstDescendantByKind(
      SyntaxKind.CaseBlock
    )
    const clauses = caseBlock.getClauses()

    const updatedClauses = clauses
      .filter(c => c.getKindName() !== 'DefaultClause')
      .map(c => c.getText() + '\r\n')

    updatedClauses.push(
      ...fields.map(
        a => `case '${a.type}':
          return { ...state${
            a.state ? `, ${a.state.name}:action.payload` : ''
          } }
        `
      )
    )

    updatedClauses.push(
      clauses.find(c => c.getKindName() === 'DefaultClause').getText()
    )

    caseBlock.replaceWithText(`{ ${updatedClauses.join('')} }`)
  }
}
