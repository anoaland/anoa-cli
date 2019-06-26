import * as path from 'path'
import { PropertySignatureStructure, StructureKind } from 'ts-morph'
import { FieldObject } from '../types'
import { Lib } from './lib'
import { Reducer } from './reducer'

export class ReducerState extends Lib {
  name: string

  private fields: FieldObject[]

  constructor(reducer: Reducer) {
    super(reducer.context)
    const { sourceFile } = reducer

    this.name = sourceFile
      .getImportDeclaration(
        i =>
          !!i
            .getModuleSpecifier()
            .getText()
            .match(/.\/state/g)
      )
      .getNamedImports()[0]
      .getText()

    const statePath = path.join(sourceFile.getDirectoryPath(), 'state.ts')
    this.sourceFile = this.context.tools
      .source()
      .project.addExistingSourceFile(statePath)
  }

  getFields() {
    if (this.fields) {
      return this.fields
    }
    return (this.fields = this.context.tools
      .ts()
      .getInterfaceFields(this.getInterface()))
  }

  addFields(fields: FieldObject[]) {
    if (!fields || !fields.length) {
      return
    }
    
    this.getInterface().addProperties(
      fields.map<PropertySignatureStructure>(f => ({
        name: f.name,
        hasQuestionToken: f.optional,
        type: f.type,
        kind: StructureKind.PropertySignature
      }))
    )
  }

  private getInterface() {
    return this.sourceFile.getInterface(this.name)
  }
}
