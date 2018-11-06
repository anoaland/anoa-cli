import { fromPath } from 'ts-emitter'
import { SyntaxKind } from 'typescript'
import { RootContext } from '..'

export function storeAppActionList(context: RootContext) {
  return async () => {
    const {
      filesystem: { inspectTree },
    } = context

    const tree = await inspectTree('src/store/actions')
    if (!tree || !tree.children || !tree.children.length) {
      return undefined
    }

    const files = tree.children
      // @ts-ignore
      .filter(r => r.type === 'file')
      // @ts-ignore
      .map(r => ({ name: r.name, path: 'src/store/actions/' + r.name }))

    let results = {}
    for (const file of files) {
      const ast = fromPath(file.path)

      ast.forEachChild(c => {
        if (c.kind === SyntaxKind.FunctionDeclaration) {
          let params = {}
          let fnName = ''

          c.forEachChild(c1 => {
            if (c1.kind === SyntaxKind.Parameter) {
              params[c1.getChildAt(0).getText()] = c1.getChildAt(2).getText()
            } else if (c1.kind === SyntaxKind.Identifier) {
              fnName = c1.getText()
            }
          })

          results[fnName] = {
            file: file.name,
            params,
          }
        }
      })
    }

    return results
  }
}
