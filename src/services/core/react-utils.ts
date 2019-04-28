import {
  ClassDeclaration,
  ConstructorDeclaration,
  InterfaceDeclaration,
  PropertySignatureStructure,
  SyntaxKind
} from 'ts-morph'
import { FieldObject } from './object-builder'

export class ReactUtils {
  static getConstructorFromClass(clazz: ClassDeclaration) {
    const constructors = clazz.getConstructors()
    return constructors.length === 1
      ? constructors[0]
      : constructors.find(c => {
          const r = c.getBodyText().match(/super\s*?\(/g)
          return r && r.length > 0
        })
  }

  static getStateInitializer(constr: ConstructorDeclaration) {
    const stateStatement = this.getStateStatement(constr)

    if (stateStatement) {
      return stateStatement
        .getChildren()[0]
        .getFirstChildByKind(SyntaxKind.ObjectLiteralExpression)
        .getProperties()
        .map(p => ({
          [p.getChildAtIndex(0).getText()]: p.getChildAtIndex(2).getText()
        }))
        .reduce((f, v) => ({ ...f, ...v }))
    }

    return {}
  }

  static replaceStateInitializer(
    constr: ConstructorDeclaration,
    fields: FieldObject[]
  ) {
    const stateStatement = this.getStateStatement(constr)
    if (stateStatement) {
      stateStatement.remove()
    }

    this.setStateInitializer(constr, fields)
  }

  static setStateInitializer(
    constr: ConstructorDeclaration,
    fields: FieldObject[]
  ) {
    constr.addStatements(this.buildStateInitializerBodyText(fields))
  }

  static replaceStateProperties(
    stateInterface: InterfaceDeclaration,
    fields: FieldObject[]
  ) {
    const newProps = fields.map<PropertySignatureStructure>(p => {
      return {
        name: p.name,
        type: p.type,
        optional: p.optional,
        hasQuestionToken: p.optional
      }
    })

    const existingProps = stateInterface.getProperties()
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

    stateInterface.addProperties(newProps)
  }

  static buildStateInitializerBodyText(fields: FieldObject[]) {
    const stateInit = fields.length
      ? fields
          .filter(p => !p.optional || p.initial)
          .map(p => `${p.name}: ${p.initial}`)
          .join(',')
      : ''

    return `this.state = {${stateInit}}`
  }

  static getStateStatement(constr: ConstructorDeclaration) {
    return constr.getStatement(f => !!f.getText().match(/this.state\s*?=/g))
  }

  static addStateReference(viewClass: ClassDeclaration, stateName: string) {
    const reactExtends = viewClass.getExtends()
    const matches = reactExtends.getText().match(/React.Component|Component/g)
    if (!matches) {
      throw new Error('Invalid React class component.')
    }

    const args = reactExtends.getNodeProperty('typeArguments')
    let props = 'any'
    if (args && args.length > 0) {
      props = args[0].getText()
    }

    const str = `${matches[0]}<${props}, ${stateName}>`
    reactExtends.replaceWithText(str)

    viewClass.getSourceFile().addImportDeclaration({
      namedImports: [stateName],
      moduleSpecifier: './state'
    })
  }

  static getInterfaceFields(intrfc: InterfaceDeclaration) {
    return intrfc.getProperties().map<FieldObject>(m => {
      return {
        name: m.getName(),
        type: m.getTypeNode().getText(),
        optional: m.hasQuestionToken()
      }
    })
  }

  static getReactClassInfo(clazz: ClassDeclaration) {
    const reactExtends = clazz.getExtends()
    const matches = reactExtends.getText().match(/React.Component|Component/g)
    if (!matches || !matches.length) {
      return undefined
    }

    const args = reactExtends.getNodeProperty('typeArguments')
    let props: string | undefined
    let state: string | undefined

    if (args) {
      if (args.length > 0) {
        props = args[0].getText()
      }

      if (args.length > 1) {
        state = args[1].getText()
      }
    }

    return {
      name: clazz.getName(),
      props,
      state
    }
  }
}
