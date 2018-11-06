import { fromPath } from 'ts-emitter'
import { SyntaxKind, Node } from 'typescript'
import { RootContext } from '..'

export function storeActionList(context: RootContext) {
  return async () => {
    const { storeReducerObjectList } = context

    // collect reducer's action files
    const actionFiles = (await storeReducerObjectList())
      .filter(r => r.children && r.children.length)
      .map(r => {
        if (r.children.find(c => c.name === 'actions.ts')) {
          return `src/store/reducers/${r.name}/actions.ts`
        }
        return undefined
      })
      .filter(s => s !== undefined)

    if (!actionFiles) {
      return undefined
    }

    let results = {}

    const parseTypeLiteral = (obj: Node) => {
      let actType = {}
      obj.forEachChild(o => {
        if (o.kind === SyntaxKind.PropertySignature) {
          const key = o.getText() as string
          const val = o.getChildAt(2).getText()
          if (key.startsWith('type')) {
            actType[o.getChildAt(0).getText()] = val.slice(1, val.length - 1)
          } else if (key.startsWith('payload')) {
            actType[o.getChildAt(0).getText()] = val
          }
        }
      })

      return actType
    }

    for (const f of actionFiles) {
      const ast = fromPath(f)

      let actionName = ''
      let actionTypes = []

      ast.forEachChild(c => {
        // get action name from 'export default' statement
        if (c.kind === SyntaxKind.ExportAssignment && c.getChildAt(1).getText() === 'default') {
          actionName = c.getChildAt(2).getText()
        }

        // query the action types
        if (c.kind === SyntaxKind.TypeAliasDeclaration) {
          c.forEachChild(c1 => {
            if (c1.kind === SyntaxKind.TypeLiteral) {
              actionTypes.push(parseTypeLiteral(c1))
            } else if (c1.kind === SyntaxKind.UnionType) {
              c1.forEachChild(c2 => {
                if (c2.kind === SyntaxKind.TypeLiteral) {
                  actionTypes.push(parseTypeLiteral(c2))
                }
              })
            }
          })
        }
      })

      results[actionName] = actionTypes
    }

    return results
  }
}
