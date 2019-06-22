import * as path from 'path'
import {
  InterfaceDeclaration,
  Project,
  PropertySignatureStructure,
  SourceFile,
  StructureKind
} from 'ts-morph'
import { RootContext } from '../../tools/context'
import { FieldObject } from '../types'

export class TsUtils {
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
   * @param fields Fields
   */
  setInterfaceProperties(
    intrfc: InterfaceDeclaration,
    fields: FieldObject[]
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
        p.remove()
      }
    }

    if (!newProps.length) {
      return
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
}
