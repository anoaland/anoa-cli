import { fromPath } from 'ts-emitter'
import { RootContext } from '.'
import { SyntaxKind } from 'typescript'

export function astIsScreenFile(context: RootContext) {
  return async (file: string) => {
    const ast = fromPath(file)
    let found = false
    let name = ''

    ast.forEachChild(c => {
      if (c.kind === SyntaxKind.FunctionDeclaration) {
        // stateless

        name = c.getChildAt(2).getText()
        if (
          c.getChildAt(0).getChildAt(0).kind === SyntaxKind.ExportKeyword &&
          name.endsWith('Screen')
        ) {
          found = true
        }
      } else if (c.kind === SyntaxKind.ClassDeclaration) {
        // class

        let identity = ''
        let isExtendFromReact = false

        c.forEachChild(c1 => {
          if (c1.kind === SyntaxKind.Identifier) {
            identity = c1.getText()
          }

          if (c1.kind === SyntaxKind.HeritageClause && c1.getText().indexOf('Component<') > -1) {
            isExtendFromReact = true
          }
        })

        if (identity.endsWith('Screen') && isExtendFromReact) {
          name = identity
          found = true
        }
      } else if (c.kind === SyntaxKind.VariableStatement) {
        // stateless functional

        c.forEachChild(c1 => {
          if (c1.kind === SyntaxKind.VariableDeclarationList) {
            c1.forEachChild(c2 => {
              if (c2.kind === SyntaxKind.VariableDeclaration) {
                c2.forEachChild(c3 => {
                  if (c3.kind === SyntaxKind.Identifier && c3.getText().endsWith('Screen')) {
                    found = true
                    name = c3.getText()
                  }
                })
              }
            })
          }
        })
      }
    })

    if (found) {
      return name
    }

    return false
  }
}
