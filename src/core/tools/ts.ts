import * as path from 'path'
import {
  InterfaceDeclaration,
  ObjectLiteralExpression,
  Project,
  PropertySignatureStructure,
  SourceFile,
  StructureKind
} from 'ts-morph'
import { FieldObject, RootContext } from '../types'

export class TsTools {
  context: RootContext
  constructor(context: RootContext) {
    this.context = context
  }

  /**
   * Create interface declaration
   * @param project Project
   * @param name Interface Name
   * @param filePath File Path
   * @param fields Fields
   */
  createInterface(
    project: Project,
    name: string,
    filePath: string,
    fields: FieldObject[]
  ): InterfaceDeclaration {
    const file = project.createSourceFile(filePath)
    const intrfc = file.addInterface({
      name,
      isExported: true
    })

    return this.setInterfaceProperties(intrfc, fields)
  }

  /**
   * Set interface properties.
   * @param intrfc Interface Declaration
   * @param fields Fields - add new fields or replace existing fields
   * @param removeOldFields Remove old fields that not listed in 'fields' parameter
   */
  setInterfaceProperties(
    intrfc: InterfaceDeclaration,
    fields: FieldObject[],
    removeOldFields: boolean = true
  ): InterfaceDeclaration {
    const newProps = fields.map<PropertySignatureStructure>(p => {
      return {
        name: p.name,
        type: p.type,
        optional: p.optional,
        hasQuestionToken: p.optional,
        kind: StructureKind.PropertySignature
      }
    })

    const existingProps = intrfc.getProperties()
    for (const p of existingProps) {
      const newProp = newProps.find(f => f.name === p.getName())
      if (newProp) {
        p.set(newProp)
        newProps.splice(newProps.indexOf(newProp), 1)
      } else {
        if (removeOldFields) {
          p.remove()
        }
      }
    }

    if (!newProps.length) {
      return intrfc
    }

    intrfc.addProperties(newProps)

    return intrfc
  }

  /**
   * Add interface import declaration if not exists.
   * @param viewFile view source file
   * @param intrfc interface declaration
   */
  addImportInterfaceDeclaration(
    viewFile: SourceFile,
    intrfc: InterfaceDeclaration
  ) {
    const modulePath = intrfc.getSourceFile().getFilePath()
    const namedImport = intrfc.getName()

    this.addNamedImport(viewFile, modulePath, namedImport)
  }

  /**
   * Add named import if not exists.
   * @param sourceFile target source file
   * @param modulePath module path
   * @param namedImport named import
   */
  addNamedImport(
    sourceFile: SourceFile,
    modulePath: string,
    namedImport: string
  ) {
    const moduleSpecifier = this.fixImportPath(
      path.relative(path.dirname(sourceFile.getFilePath()), modulePath)
    )

    const existingImport = sourceFile
      .getImportDeclarations()
      .find(i => i.getModuleSpecifierValue() === moduleSpecifier)
    if (existingImport) {
      if (
        !existingImport.getNamedImports().find(n => n.getText() === namedImport)
      ) {
        existingImport.addNamedImport(namedImport)
      }
    } else {
      sourceFile.addImportDeclaration({
        namedImports: [namedImport],
        moduleSpecifier
      })
    }
  }

  fixImportPath(modulePath: string) {
    if (!modulePath.startsWith('.')) {
      modulePath = './' + modulePath
    }

    return modulePath
      .replace(/\\/g, '/')
      .replace(/\.ts$|.tsx$|index.tsx$|index.ts$/g, '')
      .replace(/\/$/g, '')
  }

  createObjectInitializerStatement(fields: FieldObject[]): string {
    const initializer = fields.length
      ? fields
          .filter(p => !p.optional || p.initial)
          .map(p => `${p.name}: ${p.initial}`)
          .join(',')
      : ''

    return `{${initializer}}`
  }

  /**
   * Get field objects from interface declaration
   * @param intrfc Interface declaration
   */
  getInterfaceFields(intrfc: InterfaceDeclaration): FieldObject[] {
    return intrfc.getProperties().map<FieldObject>(m => {
      return {
        name: m.getName(),
        type: m.getTypeNode().getText(),
        optional: m.hasQuestionToken()
      }
    })
  }

  /**
   * Extends interface to other interface if not extended yet
   * @param intrfc interface to extends
   * @param extendsTo extends to
   */
  extendsInterface(intrfc: InterfaceDeclaration, extendsTo: string) {
    if (!intrfc.getExtends().find(e => e.getText() === extendsTo)) {
      intrfc.addExtends(extendsTo)
    }
  }

  /**
   * Get interface declaration from source file
   * if not exsits then create new one
   */
  getOrAddInterface(
    sourceFile: SourceFile,
    interfaceName: string,
    isExported: boolean = true
  ) {
    return (
      sourceFile.getInterface(interfaceName) ||
      sourceFile.addInterface({ name: interfaceName, isExported })
    )
  }

  mergePropertyAssignments(
    obj: ObjectLiteralExpression,
    fields: FieldObject[]
  ) {
    const existingFields = obj.getProperties().map<FieldObject>(p => {
      const stmt = p.getText().split(':')
      return {
        name: stmt[0].trim(),
        type: stmt[1].trim()
      }
    })

    const newFields = fields.filter(f => {
      return !existingFields.some(e => e.name === f.name)
    })

    obj.addPropertyAssignments(
      newFields.map(f => ({
        name: f.name,
        initializer: f.type
      }))
    )
  }
}
